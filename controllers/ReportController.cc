#include "ReportController.h"

#include <cstdlib>
#include <memory>
#include <string>

#include <drogon/drogon.h>
#include <json/json.h>

namespace
{
using drogon::HttpRequestPtr;
using drogon::HttpResponsePtr;
using Callback = std::function<void(const HttpResponsePtr &)>;
using CallbackPtr = std::shared_ptr<Callback>;

constexpr char kOpenStatus[] = "open";
constexpr char kDeletedStatus[] = "deleted";
constexpr char kDismissedStatus[] = "dismissed";
constexpr char kAdminRole[] = "admin";

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

bool requireAuthenticated(const HttpRequestPtr &req, const CallbackPtr &callback)
{
    auto session = req->session();
    if (!session)
    {
        Json::Value body(Json::objectValue);
        body["success"] = false;
        body["message"] = "Session support is unavailable";
        sendJson(callback, drogon::k500InternalServerError, std::move(body));
        return false;
    }

    if (!session->find("account_id"))
    {
        Json::Value body(Json::objectValue);
        body["success"] = false;
        body["message"] = "Authentication required";
        sendJson(callback, drogon::k401Unauthorized, std::move(body));
        return false;
    }

    return true;
}

bool requireAdmin(const HttpRequestPtr &req, const CallbackPtr &callback)
{
    if (!requireAuthenticated(req, callback))
    {
        return false;
    }

    const auto role = req->session()->getOptional<std::string>("role");
    if (!role || *role != kAdminRole)
    {
        Json::Value body(Json::objectValue);
        body["success"] = false;
        body["message"] = "Admin access required";
        sendJson(callback, drogon::k403Forbidden, std::move(body));
        return false;
    }

    return true;
}

void respondDatabaseError(const CallbackPtr &callback,
                          const std::string &logMessage,
                          const std::string &userMessage,
                          const drogon::orm::DrogonDbException &e)
{
    LOG_ERROR << logMessage << ": " << e.base().what();
    Json::Value body(Json::objectValue);
    body["success"] = false;
    body["message"] = userMessage;
    sendJson(callback, drogon::k500InternalServerError, std::move(body));
}
}  // namespace

namespace api
{
void ReportController::createReport(const HttpRequestPtr &req,
                                    Callback &&callback) const
{
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    if (!requireAuthenticated(req, callbackPtr))
    {
        return;
    }

    const auto json = req->getJsonObject();
    if (!json)
    {
        Json::Value body(Json::objectValue);
        body["success"] = false;
        body["message"] = "Request body must be valid JSON";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    const int priceEntryId = (*json).get("price_entry_id", 0).asInt();
    const int storeId = (*json).get("store_id", 0).asInt();
    const Json::Value itemDetails = (*json)["item_details"];
    const int itemId = itemDetails.get("item_id", 0).asInt();
    const std::string reason = trim((*json).get("reason", "").asString());

    if (priceEntryId <= 0 || storeId <= 0 || itemId <= 0)
    {
        Json::Value body(Json::objectValue);
        body["success"] = false;
        body["message"] = "Report context is incomplete";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    if (reason.empty())
    {
        Json::Value body(Json::objectValue);
        body["success"] = false;
        body["message"] = "A reason is required";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    if (reason.size() > 2000)
    {
        Json::Value body(Json::objectValue);
        body["success"] = false;
        body["message"] = "Reason must be 2000 characters or fewer";
        sendJson(callbackPtr, drogon::k400BadRequest, std::move(body));
        return;
    }

    const int reporterAccountId = req->session()->get<int>("account_id");

    dbClient()->execSqlAsync(
        "select p.entry_id "
        "from price_entries p "
        "where p.entry_id = $1 and p.store_id = $2 and p.item_id = $3 "
        "limit 1",
        [callbackPtr, reporterAccountId, priceEntryId, reason](
            const drogon::orm::Result &result) {
            if (result.empty())
            {
                Json::Value body(Json::objectValue);
                body["success"] = false;
                body["message"] = "The selected price entry could not be found";
                sendJson(callbackPtr, drogon::k404NotFound, std::move(body));
                return;
            }

            dbClient()->execSqlAsync(
                "insert into reports "
                "(reporter_account_id, price_entry_id, reason_for_report, resolution_status) "
                "values ($1, $2, $3, $4) "
                "returning report_id, report_timestamp, resolution_status",
                [callbackPtr](const drogon::orm::Result &insertResult) {
                    Json::Value body(Json::objectValue);
                    body["success"] = true;
                    body["message"] = "Report submitted successfully";

                    if (!insertResult.empty())
                    {
                        const auto &row = insertResult[0];
                        Json::Value report(Json::objectValue);
                        report["report_id"] = row["report_id"].as<int>();
                        report["report_timestamp"] =
                            row["report_timestamp"].as<std::string>();
                        report["resolution_status"] =
                            row["resolution_status"].as<std::string>();
                        body["report"] = report;
                    }

                    sendJson(callbackPtr, drogon::k201Created, std::move(body));
                },
                [callbackPtr](const drogon::orm::DrogonDbException &e) {
                    respondDatabaseError(callbackPtr,
                                         "Report insert failed",
                                         "Unable to submit report",
                                         e);
                },
                reporterAccountId,
                priceEntryId,
                reason,
                std::string(kOpenStatus));
        },
        [callbackPtr](const drogon::orm::DrogonDbException &e) {
            respondDatabaseError(callbackPtr,
                                 "Report validation query failed",
                                 "Unable to validate report context",
                                 e);
        },
        priceEntryId,
        storeId,
        itemId);
}

void ReportController::listOpenReports(const HttpRequestPtr &req,
                                       Callback &&callback) const
{
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    if (!requireAdmin(req, callbackPtr))
    {
        return;
    }

    dbClient()->execSqlAsync(
        "select p.entry_id, "
        "       s.name as store_name, "
        "       i.item_name, "
        "       p.logged_price, "
        "       count(r.report_id) as report_count, "
        "       max(r.report_timestamp) as last_report_timestamp "
        "from reports r "
        "join price_entries p on p.entry_id = r.price_entry_id "
        "join stores s on s.store_id = p.store_id "
        "join items i on i.item_id = p.item_id "
        "where r.resolution_status = $1 "
        "group by p.entry_id, s.name, i.item_name, p.logged_price "
        "order by max(r.report_timestamp) asc",
        [callbackPtr](const drogon::orm::Result &result) {
            Json::Value reports(Json::arrayValue);

            for (const auto &row : result)
            {
                Json::Value report(Json::objectValue);
                report["entry_id"] = row["entry_id"].as<int>();
                report["store_name"] = row["store_name"].as<std::string>();
                report["item_name"] = row["item_name"].as<std::string>();
                report["reported_price"] =
                    std::atof(row["logged_price"].as<std::string>().c_str());
                report["report_count"] = row["report_count"].as<int>();
                report["last_submitted_at"] =
                    row["last_report_timestamp"].as<std::string>();
                reports.append(report);
            }

            Json::Value body(Json::objectValue);
            body["success"] = true;
            body["reports"] = reports;
            sendJson(callbackPtr, drogon::k200OK, std::move(body));
        },
        [callbackPtr](const drogon::orm::DrogonDbException &e) {
            respondDatabaseError(
                callbackPtr, "Open reports query failed", "Unable to load reports", e);
        },
        std::string(kOpenStatus));
}

void ReportController::getEntryReports(const HttpRequestPtr &req,
                                       Callback &&callback,
                                       int entryId) const
{
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    if (!requireAdmin(req, callbackPtr))
    {
        return;
    }

    dbClient()->execSqlAsync(
        "select p.entry_id, "
        "       s.name as store_name, "
        "       i.item_name, "
        "       p.logged_price, "
        "       r.report_id, "
        "       r.reporter_account_id, "
        "       a.name as reporter_name, "
        "       a.email as reporter_email, "
        "       r.reason_for_report, "
        "       r.report_timestamp "
        "from reports r "
        "join price_entries p on p.entry_id = r.price_entry_id "
        "join stores s on s.store_id = p.store_id "
        "join items i on i.item_id = p.item_id "
        "left join accounts a on a.account_id = r.reporter_account_id "
        "where p.entry_id = $1 and r.resolution_status = $2 "
        "order by r.report_timestamp asc",
        [callbackPtr, entryId](const drogon::orm::Result &result) {
            if (result.empty())
            {
                Json::Value body(Json::objectValue);
                body["success"] = false;
                body["message"] = "No open reports found for this entry";
                sendJson(callbackPtr, drogon::k404NotFound, std::move(body));
                return;
            }

            Json::Value body(Json::objectValue);
            body["success"] = true;

            Json::Value entry(Json::objectValue);
            entry["entry_id"] = entryId;
            entry["store_name"] = result[0]["store_name"].as<std::string>();
            entry["item_name"] = result[0]["item_name"].as<std::string>();
            entry["reported_price"] =
                std::atof(result[0]["logged_price"].as<std::string>().c_str());

            Json::Value reports(Json::arrayValue);
            for (const auto &row : result)
            {
                Json::Value report(Json::objectValue);
                report["report_id"] = row["report_id"].as<int>();
                report["reporter_account_id"] = row["reporter_account_id"].isNull()
                                                     ? Json::Value()
                                                     : Json::Value(
                                                           row["reporter_account_id"].as<int>());
                report["reporter_name"] = row["reporter_name"].isNull()
                                               ? Json::Value()
                                               : Json::Value(
                                                     row["reporter_name"].as<std::string>());
                report["reporter_email"] = row["reporter_email"].isNull()
                                                ? Json::Value()
                                                : Json::Value(
                                                      row["reporter_email"].as<std::string>());
                report["reason"] = row["reason_for_report"].isNull()
                                       ? std::string()
                                       : row["reason_for_report"].as<std::string>();
                report["submitted_at"] = row["report_timestamp"].as<std::string>();
                reports.append(report);
            }

            entry["reports"] = reports;
            body["entry"] = entry;
            sendJson(callbackPtr, drogon::k200OK, std::move(body));
        },
        [callbackPtr](const drogon::orm::DrogonDbException &e) {
            respondDatabaseError(callbackPtr,
                                 "Entry reports query failed",
                                 "Unable to load entry reports",
                                 e);
        },
        entryId,
        std::string(kOpenStatus));
}

void ReportController::deleteEntryAndResolve(const HttpRequestPtr &req,
                                             Callback &&callback,
                                             int entryId) const
{
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    if (!requireAdmin(req, callbackPtr))
    {
        return;
    }

    const int adminAccountId = req->session()->get<int>("account_id");
    auto transaction = dbClient()->newTransaction();

    transaction->execSqlAsync(
        "select entry_id "
        "from price_entries "
        "where entry_id = $1 "
        "and exists ("
        "    select 1 from reports "
        "    where price_entry_id = price_entries.entry_id "
        "      and resolution_status = $2"
        ") "
        "for update",
        [callbackPtr, transaction, entryId, adminAccountId](
            const drogon::orm::Result &result) {
            if (result.empty())
            {
                Json::Value body(Json::objectValue);
                body["success"] = false;
                body["message"] = "No open reports found for this entry";
                sendJson(callbackPtr, drogon::k404NotFound, std::move(body));
                return;
            }

            transaction->execSqlAsync(
                "with updated as ("
                "    update reports "
                "    set resolution_status = $1, "
                "        price_entry_id = null "
                "    where price_entry_id = $2 "
                "      and resolution_status = $3 "
                "    returning report_id"
                ") "
                "insert into admin_reports (admin_account_id, report_id) "
                "select $4, report_id from updated "
                "on conflict do nothing",
                [callbackPtr, transaction, entryId](
                    const drogon::orm::Result &) {
                    transaction->execSqlAsync(
                        "delete from price_entries where entry_id = $1",
                        [callbackPtr](
                            const drogon::orm::Result &) {
                            Json::Value body(Json::objectValue);
                            body["success"] = true;
                            body["message"] =
                                "Price entry deleted and all related reports resolved";
                            sendJson(callbackPtr, drogon::k200OK, std::move(body));
                        },
                        [callbackPtr](const drogon::orm::DrogonDbException &e) {
                            respondDatabaseError(callbackPtr,
                                                 "Price entry delete failed",
                                                 "Unable to delete price entry",
                                                 e);
                        },
                        entryId);
                },
                [callbackPtr](const drogon::orm::DrogonDbException &e) {
                    respondDatabaseError(callbackPtr,
                                         "Bulk report resolution before delete failed",
                                         "Unable to resolve report",
                                         e);
                },
                std::string(kDeletedStatus),
                entryId,
                std::string(kOpenStatus),
                adminAccountId);
        },
        [callbackPtr](const drogon::orm::DrogonDbException &e) {
            respondDatabaseError(callbackPtr,
                                 "Report lookup for delete failed",
                                 "Unable to resolve report",
                                 e);
        },
        entryId,
        std::string(kOpenStatus));
}

void ReportController::dismissReport(const HttpRequestPtr &req,
                                     Callback &&callback,
                                     int entryId) const
{
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    if (!requireAdmin(req, callbackPtr))
    {
        return;
    }

    const int adminAccountId = req->session()->get<int>("account_id");
    auto transaction = dbClient()->newTransaction();

    transaction->execSqlAsync(
        "with updated as ("
        "    update reports "
        "    set resolution_status = $1 "
        "    where price_entry_id = $2 "
        "      and resolution_status = $3 "
        "    returning report_id"
        ") "
        "insert into admin_reports (admin_account_id, report_id) "
        "select $4, report_id from updated "
        "on conflict do nothing "
        "returning report_id",
        [callbackPtr](const drogon::orm::Result &result) {
            if (result.empty())
            {
                Json::Value body(Json::objectValue);
                body["success"] = false;
                body["message"] = "No open reports found for this entry";
                sendJson(callbackPtr, drogon::k404NotFound, std::move(body));
                return;
            }

            Json::Value body(Json::objectValue);
            body["success"] = true;
            body["message"] = "All reports for this entry were dismissed";
            sendJson(callbackPtr, drogon::k200OK, std::move(body));
        },
        [callbackPtr](const drogon::orm::DrogonDbException &e) {
            respondDatabaseError(callbackPtr,
                                 "Dismiss report update failed",
                                 "Unable to dismiss report",
                                 e);
        },
        std::string(kDismissedStatus),
        entryId,
        std::string(kOpenStatus),
        adminAccountId);
}

void ReportController::checkUserReport(const HttpRequestPtr &req,
                                       Callback &&callback,
                                       int entryId) const
{
    auto callbackPtr = std::make_shared<Callback>(std::move(callback));
    if (!requireAuthenticated(req, callbackPtr))
    {
        return;
    }

    const int accountId = req->session()->get<int>("account_id");

    dbClient()->execSqlAsync(
        "select 1 from reports "
        "where reporter_account_id = $1 and price_entry_id = $2 "
        "limit 1",
        [callbackPtr](const drogon::orm::Result &result) {
            Json::Value body(Json::objectValue);
            body["success"] = true;
            body["has_reported"] = !result.empty();
            sendJson(callbackPtr, drogon::k200OK, std::move(body));
        },
        [callbackPtr](const drogon::orm::DrogonDbException &e) {
            respondDatabaseError(callbackPtr,
                                 "Check user report query failed",
                                 "Unable to check report status",
                                 e);
        },
        accountId,
        entryId);
}
}  // namespace api
