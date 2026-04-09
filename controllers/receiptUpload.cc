#include <drogon/HttpController.h>
#include <drogon/drogon.h>

#include <filesystem>

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

        for (auto& file : files) {
            std::string path = std::filesystem::current_path();
            std::string groceryGrid = "GroceryGrid/";
            size_t found = path.find(groceryGrid);

            if (found != std::string::npos) {
                path = path.substr(0, found + groceryGrid.length());
                file.saveAs(path + "uploads/" + file.getFileName());
            } else {
                file.saveAs("uploads/" + file.getFileName());
            }
        }

        auto resp = HttpResponse::newHttpResponse();
        resp->setStatusCode(k200OK);
        resp->addHeader("Access-Control-Allow-Origin", "http://localhost:5173");
        resp->setBody("Upload successful");
        callback(resp);
    }
};
