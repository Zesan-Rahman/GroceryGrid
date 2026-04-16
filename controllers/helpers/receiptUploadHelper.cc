#include "receiptUploadHelper.h"

namespace {
std::string trim(std::string value) {
    const auto start = value.find_first_not_of(" \t\r\n");
    if (start == std::string::npos) {
        return "";
    }
    const auto end = value.find_last_not_of(" \t\r\n");
    return value.substr(start, end - start + 1);
}

std::string stripMatchingQuotes(std::string value) {
    if (value.size() >= 2) {
        const char first = value.front();
        const char last = value.back();
        if ((first == '"' && last == '"') || (first == '\'' && last == '\'')) {
            return value.substr(1, value.size() - 2);
        }
    }
    return value;
}
}  // namespace

void loadEnv(const std::string& filepath) {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        std::cerr << "Warning: could not open .env file at " << filepath << std::endl;
        return;
    }
    std::string line;
    while (std::getline(file, line)) {
        line = trim(line);
        if (line.empty() || line[0] == '#') continue;

        auto delimPos = line.find('=');
        if (delimPos == std::string::npos) continue;

        std::string key = trim(line.substr(0, delimPos));
        std::string value = stripMatchingQuotes(trim(line.substr(delimPos + 1)));
        if (key.empty()) continue;

        setenv(key.c_str(), value.c_str(), 0); // 0 = don't overwrite if already set
    }
}

bool loadEnvFromProjectRoot() {
    static bool loaded = false;
    static bool attempted = false;
    if (attempted) {
        return loaded;
    }

    attempted = true;
    std::filesystem::path current = std::filesystem::current_path();
    while (true) {
        const auto envPath = current / ".env";
        if (std::filesystem::exists(envPath)) {
            loadEnv(envPath.string());
            loaded = true;
            return true;
        }

        if (current == current.root_path()) {
            break;
        }
        current = current.parent_path();
    }

    std::cerr << "Warning: could not find .env from " << std::filesystem::current_path() << std::endl;
    return false;
}

std::string sendToTabScanner(const std::string& filePath) {
    loadEnvFromProjectRoot();
    const char* apiKey = std::getenv("TABSCANNER_API_KEY");
    if (!apiKey) {
        std::cerr << "TABSCANNER_API_KEY not set" << std::endl;
        return "";
    }

    CURL* curl = curl_easy_init();
    if (!curl) {
        std::cout << "Curl failed to init" << std::endl;
        return "";
    }

    curl_mime* mime = curl_mime_init(curl);
    curl_mimepart* part = curl_mime_addpart(mime);
    curl_mime_name(part, "file");
    curl_mime_filedata(part, filePath.c_str());

    std::string apiKeyHeader = std::string("apikey: ") + apiKey;
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, apiKeyHeader.c_str());

    std::string responseData;
    curl_easy_setopt(curl, CURLOPT_URL, "https://api.tabscanner.com/api/2/process");
    curl_easy_setopt(curl, CURLOPT_MIMEPOST, mime);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(
        curl, CURLOPT_WRITEFUNCTION, +[](char* ptr, size_t size, size_t nmemb, void* userdata) -> size_t {
            auto* response = static_cast<std::string*>(userdata);
            response->append(ptr, size * nmemb);
            return size * nmemb;
        });
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseData);

    curl_easy_perform(curl);
    curl_mime_free(mime);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    // Print response
    std::cout << "TabScanner process response: " << responseData << std::endl;

    auto json = nlohmann::json::parse(responseData, nullptr, false);
    if (!json.is_discarded() && json.contains("token")) {
        return json["token"].get<std::string>();
    }
    return "";
}

std::string getTabScannerResult(const std::string& token) {
    loadEnvFromProjectRoot();
    const char* apiKey = std::getenv("TABSCANNER_API_KEY");
    if (!apiKey) {
        std::cerr << "TABSCANNER_API_KEY not set" << std::endl;
        return "";
    }

    CURL* curl = curl_easy_init();
    if (!curl) return "";

    std::string url = "https://api.tabscanner.com/api/result/" + token;
    std::string responseData;


    std::string apiKeyHeader = std::string("apikey: ") + apiKey;
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, apiKeyHeader.c_str());

    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPGET, 1L);
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(
        curl, CURLOPT_WRITEFUNCTION, +[](char* ptr, size_t size, size_t nmemb, void* userdata) -> size_t {
            auto* response = static_cast<std::string*>(userdata);
            response->append(ptr, size * nmemb);
            return size * nmemb;
        });
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &responseData);

    curl_easy_perform(curl);
    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);

    return responseData;
}
