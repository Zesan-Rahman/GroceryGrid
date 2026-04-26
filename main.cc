#include <drogon/drogon.h>
#include <filesystem>
#include <string>

using namespace drogon;

int main(int argc, char *argv[]) {
    // load config
    app().loadConfigFile("config.json");

    // Catch-all route for frontend SPA
    app().registerHandler(
        R"(/(.*))",
        [](const HttpRequestPtr &req,
           std::function<void(const HttpResponsePtr &)> &&callback,
           const std::string &path) {
            // Check if it's an API route - let it fall through or handle 404 here
            if (path.find("api/") == 0) {
                callback(HttpResponse::newNotFoundResponse());
                return;
            }

            // Use the document root from the configuration
            std::string docRoot = app().getDocumentRoot();
            if (docRoot.empty()) {
                docRoot = "./";
            }
            
            std::string filePath = docRoot + "/" + path;
            if (path.empty() || path == "/") {
                filePath = docRoot + "/index.html";
            }

            if (std::filesystem::exists(filePath) && !std::filesystem::is_directory(filePath)) {
                callback(HttpResponse::newFileResponse(filePath));
            } else {
                // Fallback to index.html for SPA routing
                callback(HttpResponse::newFileResponse(docRoot + "/index.html"));
            }
        },
        {Get});

    // Run HTTP framework,the method will block in the internal event loop
    app().run();
    return 0;
}
