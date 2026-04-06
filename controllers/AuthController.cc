#include "AuthController.h"

#include <crypt.h>

#include <algorithm>
#include <cctype>
#include <cstring>
#include <memory>
#include <string>

#include <drogon/drogon.h>
#include <drogon/orm/DbClient.h>
#include <json/json.h>

namespace
{
using drogon::HttpRequestPtr;
using drogon::HttpResponsePtr;
using Callback = std::function<void(const HttpResponsePtr &)>;
using CallbackPtr = std::shared_ptr<Callback>;

constexpr char kUserRole[] = "user";
constexpr unsigned long kBcryptCost = 12;

std::string trim(const std::string &value)
{
    const auto start = value.find_first_not_of(" \t\r\n");
    if (start == std::string::npos)
    {
        return "";
    }

    const auto end = value.find_last_not_of(" \t\r\n");
    return value.substr(start, end - start + 1);
}

std::string normalizeEmail(const std::string &email)
{
    auto normalized = trim(email);
    std::transform(normalized.begin(),
                   normalized.end(),
                   normalized.begin(),
                   [](unsigned char ch) { return std::tolower(ch); });
    return normalized;
}

bool isValidEmail(const std::string &email)
{
    const auto atPos = email.find('@');
    if (atPos == std::string::npos || atPos == 0 || atPos == email.size() - 1)
    {
        return false;
    }

    const auto dotPos = email.find('.', atPos);
    return dotPos != std::string::npos && dotPos < email.size() - 1;
}

bool constantTimeEquals(const std::string &left, const std::string &right)
{
    if (left.size() != right.size())
    {
        return false;
    }

    unsigned char diff = 0;
    for (size_t i = 0; i < left.size(); ++i)
    {
        diff |= static_cast<unsigned char>(left[i] ^ right[i]);
    }
    return diff == 0;
}

std::string generateBcryptHash(const std::string &password)
{
    char salt[CRYPT_GENSALT_OUTPUT_SIZE];
    if (crypt_gensalt_rn("$2b$", kBcryptCost, nullptr, 0, salt, sizeof(salt)) ==
        nullptr)
    {
        throw std::runtime_error("Failed to generate bcrypt salt");
    }

    struct crypt_data data;
    std::memset(&data, 0, sizeof(data));
    char *hashed = crypt_r(password.c_str(), salt, &data);
    if (hashed == nullptr || hashed[0] == '*')
    {
        throw std::runtime_error("Failed to hash password");
    }

    return std::string(hashed);
}

bool verifyPassword(const std::string &password, const std::string &storedHash)
{
    struct crypt_data data;
    std::memset(&data, 0, sizeof(data));
    char *hashed = crypt_r(password.c_str(), storedHash.c_str(), &data);
    if (hashed == nullptr || hashed[0] == '*')
    {
        return false;
    }

    return constantTimeEquals(std::string(hashed), storedHash);
}

drogon::orm::DbClientPtr dbClient()
{
    static auto client = drogon::app().getDbClient("default");
    return client;
}

void sendJson(const CallbackPtr &callback,
              drogon::HttpStatusCode status,
              Json::Value body)
{
    auto response = drogon::HttpResponse::newHttpJsonResponse(body);
    response->setStatusCode(status);
    (*callback)(response);
}

bool requireSession(const HttpRequestPtr &req, const CallbackPtr &callback)
{
    if (req->session())
    {
        return true;
    }

    Json::Value body;
    body["success"] = false;
    body["message"] =
        "Session support is disabled. Set app.enable_session to true in config.json";
    sendJson(callback, drogon::k500InternalServerError, std::move(body));
    return false;
}

Json::Value userJson(int accountId,
                     const std::string &name,
                     const std::string &email,
                     const std::string &role)
{
    Json::Value user(Json::objectValue);
    user["id"] = accountId;
    user["name"] = name;
    user["email"] = email;
    user["role"] = role;
    return user;
}
}  // namespace

namespace api
{
void AuthController::registerAccount(const HttpRequestPtr &req,
                                     Callback &&callback) const
{
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    const auto json = req->getJsonObject();
    if (!json)
    {
        Json::Value body;
        body["success"] = false;
        body["message"] = "Request body must be valid JSON";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    const std::string name = trim((*json).get("name", "").asString());
    const std::string email = normalizeEmail((*json).get("email", "").asString());
    const std::string password = (*json).get("password", "").asString();

    if (name.empty() || name.size() > 100)
    {
        Json::Value body;
        body["success"] = false;
        body["message"] = "Name is required and must be 100 characters or fewer";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    if (!isValidEmail(email) || email.size() > 255)
    {
        Json::Value body;
        body["success"] = false;
        body["message"] = "A valid email is required";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    if (password.size() < 8 || password.size() > 128)
    {
        Json::Value body;
        body["success"] = false;
        body["message"] = "Password must be between 8 and 128 characters";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    auto client = dbClient();
    client->execSqlAsync(
        "select account_id from accounts where email = $1 limit 1",
        [callbackPtr, name, email, password](const drogon::orm::Result &result) {
            if (!result.empty())
            {
                Json::Value body;
                body["success"] = false;
                body["message"] = "An account with that email already exists";
                sendJson(callbackPtr, drogon::k409Conflict, std::move(body));
                return;
            }

            std::string passwordHash;
            try
            {
                passwordHash = generateBcryptHash(password);
            }
            catch (const std::exception &)
            {
                Json::Value body;
                body["success"] = false;
                body["message"] = "Unable to secure the password";
                sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
                return;
            }

            dbClient()->execSqlAsync(
                "insert into accounts (email, password, name, role) "
                "values ($1, $2, $3, $4) "
                "on conflict (email) do nothing "
                "returning account_id, email, name, role",
                [callbackPtr](const drogon::orm::Result &insertResult) {
                    if (insertResult.empty())
                    {
                        Json::Value body;
                        body["success"] = false;
                        body["message"] = "An account with that email already exists";
                        sendJson(callbackPtr, drogon::k409Conflict, std::move(body));
                        return;
                    }

                    const auto row = insertResult[0];
                    const auto displayName =
                        row["name"].isNull() ? std::string() : row["name"].as<std::string>();

                    Json::Value body;
                    body["success"] = true;
                    body["message"] = "Registration successful";
                    body["user"] = userJson(row["account_id"].as<int>(),
                                            displayName,
                                            row["email"].as<std::string>(),
                                            row["role"].as<std::string>());
                    sendJson(callbackPtr, drogon::k201Created, std::move(body));
                },
                [callbackPtr](const drogon::orm::DrogonDbException &e) {
                    LOG_ERROR << "Registration insert failed: " << e.base().what();
                    Json::Value body;
                    body["success"] = false;
                    body["message"] = "Unable to create account";
                    sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
                },
                email,
                passwordHash,
                name,
                std::string(kUserRole));
        },
        [callbackPtr](const drogon::orm::DrogonDbException &e) {
            LOG_ERROR << "Registration lookup failed: " << e.base().what();
            Json::Value body;
            body["success"] = false;
            body["message"] = "Unable to check existing accounts";
            sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
        },
        email);
}

void AuthController::login(const HttpRequestPtr &req, Callback &&callback) const
{
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    const auto json = req->getJsonObject();
    if (!json)
    {
        Json::Value body;
        body["success"] = false;
        body["message"] = "Request body must be valid JSON";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    const std::string email = normalizeEmail((*json).get("email", "").asString());
    const std::string password = (*json).get("password", "").asString();

    if (!isValidEmail(email) || password.empty())
    {
        Json::Value body;
        body["success"] = false;
        body["message"] = "Email and password are required";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    dbClient()->execSqlAsync(
        "select account_id, email, password, name, role "
        "from accounts where email = $1 limit 1",
        [callbackPtr, req, password](const drogon::orm::Result &result) {
            if (result.empty())
            {
                Json::Value body;
                body["success"] = false;
                body["message"] = "Invalid email or password";
                sendJson(callbackPtr, drogon::k401Unauthorized, std::move(body));
                return;
            }

            const auto row = result[0];
            const std::string storedHash = row["password"].as<std::string>();
            if (!verifyPassword(password, storedHash))
            {
                Json::Value body;
                body["success"] = false;
                body["message"] = "Invalid email or password";
                sendJson(callbackPtr, drogon::k401Unauthorized, std::move(body));
                return;
            }

            const auto displayName =
                row["name"].isNull() ? std::string() : row["name"].as<std::string>();
            auto session = req->session();
            if (!session)
            {
                Json::Value body;
                body["success"] = false;
                body["message"] =
                    "Session support is disabled. Set app.enable_session to true in config.json";
                sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
                return;
            }
            session->insert("account_id", row["account_id"].as<int>());
            session->insert("name", displayName);
            session->insert("email", row["email"].as<std::string>());
            session->insert("role", row["role"].as<std::string>());
            session->changeSessionIdToClient();

            Json::Value body;
            body["success"] = true;
            body["user"] = userJson(row["account_id"].as<int>(),
                                    displayName,
                                    row["email"].as<std::string>(),
                                    row["role"].as<std::string>());
            sendJson(callbackPtr, drogon::k200OK, std::move(body));
        },
        [callbackPtr](const drogon::orm::DrogonDbException &e) {
            LOG_ERROR << "Login lookup failed: " << e.base().what();
            Json::Value body;
            body["success"] = false;
            body["message"] = "Unable to log in";
            sendJson(callbackPtr, drogon::k500InternalServerError, std::move(body));
        },
        email);
}

void AuthController::me(const HttpRequestPtr &req, Callback &&callback) const
{
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    if (!requireSession(req, callbackPtr))
    {
        return;
    }
    auto session = req->session();
    const auto accountId = session->getOptional<int>("account_id");
    const auto name = session->getOptional<std::string>("name");
    const auto email = session->getOptional<std::string>("email");
    const auto role = session->getOptional<std::string>("role");

    if (!accountId || !name || !email || !role)
    {
        Json::Value body;
        body["success"] = false;
        body["message"] = "Not authenticated";
        sendJson(callbackPtr, drogon::k401Unauthorized, std::move(body));
        return;
    }

    Json::Value body;
    body["success"] = true;
    body["user"] = userJson(*accountId, *name, *email, *role);
    sendJson(callbackPtr, drogon::k200OK, std::move(body));
}

void AuthController::logout(const HttpRequestPtr &req, Callback &&callback) const
{
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    if (!requireSession(req, callbackPtr))
    {
        return;
    }
    auto session = req->session();
    session->clear();

    Json::Value body;
    body["success"] = true;
    body["message"] = "Logged out";
    sendJson(callbackPtr, drogon::k200OK, std::move(body));
}
}  // namespace api
