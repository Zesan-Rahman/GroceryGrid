#include "receiptUploadHelper.h"

std::string sendToTabScanner(const std::string& filePath) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        std::cout << "Curl failed to init" << std::endl;
        return "";
    }

    curl_mime* mime = curl_mime_init(curl);
    curl_mimepart* part = curl_mime_addpart(mime);
    curl_mime_name(part, "file");
    curl_mime_filedata(part, filePath.c_str());

    struct curl_slist* headers = nullptr;
    headers =
        curl_slist_append(headers, "apikey: ZrYHNDrMFa8JOwQpqTUrEr6vAlmNzGzcxFYw0lsIEoKA7kgMokEpLwyYOfeeshuq");

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
    CURL* curl = curl_easy_init();
    if (!curl) return "";

    std::string url = "https://api.tabscanner.com/api/result/" + token;
    std::string responseData;

    struct curl_slist* headers = nullptr;
    headers =
        curl_slist_append(headers, "apikey: ZrYHNDrMFa8JOwQpqTUrEr6vAlmNzGzcxFYw0lsIEoKA7kgMokEpLwyYOfeeshuq");

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
