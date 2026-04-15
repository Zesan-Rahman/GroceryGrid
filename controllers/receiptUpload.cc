#include <drogon/HttpController.h>
#include <drogon/drogon.h>

#include <filesystem>

#include "./helpers/receiptUploadHelper.h"

using namespace drogon;

class UploadController : public HttpController<UploadController> {
public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(UploadController::upload, "/api/upload", Post);
    METHOD_LIST_END
    void upload(const HttpRequestPtr& req, std::function<void(const HttpResponsePtr&)>&& callback) {
        MultiPartParser fileParser;
        fileParser.parse(req);
        auto files = fileParser.getFiles();

        std::string lastSavedPath;
        std::string resultJson;

        for (auto& file : files) {
            std::string path = std::filesystem::current_path();
            std::string groceryGrid = "GroceryGrid";
            size_t found = path.find(groceryGrid);
            if (found != std::string::npos) {
                path = path.substr(0, found + groceryGrid.length());
                lastSavedPath = path + "/uploads/" + file.getFileName();
                file.saveAs(path + "/uploads/" + file.getFileName());
            } else {
                lastSavedPath = "uploads/" + file.getFileName();
                file.saveAs(lastSavedPath);
            }
        }

        if (!lastSavedPath.empty()) {
            std::string token = sendToTabScanner(lastSavedPath);
            std::cout << "Tabscanner token: " << token << std::endl;
            if (!token.empty()) {
                std::this_thread::sleep_for(std::chrono::seconds(5));
                for (int i = 0; i < 5; i++) {
                    resultJson = getTabScannerResult(token);
                    std::cout << "Tabscanner result: " << resultJson << std::endl;
                    auto json = nlohmann::json::parse(resultJson, nullptr, false);
                    if (!json.is_discarded() && json.value("status_code", 0) == 202) {
                        break;
                    }
                    std::this_thread::sleep_for(std::chrono::seconds(1));
                }
            }
        }

        auto resp = HttpResponse::newHttpResponse();
        resp->setStatusCode(k200OK);
        resp->addHeader("Access-Control-Allow-Origin", "http://localhost:5173");
        resp->addHeader("Content-Type", "application/json");
        resp->setBody(resultJson.empty() ? "{\"success\":false,\"message\":\"failed to get result\"}"
                                         : resultJson);
        callback(resp);
    }
};
