#include <drogon/drogon.h>
#include <filesystem>
#include <fstream>
#include <string>
#include <json/json.h>

using namespace drogon;
namespace fs = std::filesystem;

int main(int argc, char *argv[]) {
    // load config
    app().loadConfigFile("config.json");

    // Resolve document_root from config for SPA fallback
    std::string docRoot;
    {
        std::ifstream cfgFile("config.json");
        if (cfgFile.is_open()) {
            Json::Value cfg;
            Json::CharReaderBuilder rdr;
            std::string errs;
            if (Json::parseFromStream(rdr, cfgFile, &cfg, &errs)) {
                docRoot = cfg["app"].get("document_root", "").asString();
            }
        }
    }

    // SPA catch-all: serve index.html for any path that isn't an API route
    // or a real file that exists under document_root.
    app().registerHandler(
        "/{path}",
        [docRoot](const HttpRequestPtr &req,
                  std::function<void(const HttpResponsePtr &)> &&callback,
                  const std::string &path) {
            // Let API routes fall through to their own handlers
            if (path.rfind("api/", 0) == 0) {
                auto resp = HttpResponse::newNotFoundResponse();
                callback(resp);
                return;
            }

            // If the request maps to a real file, let Drogon's static handler
            // serve it (this handler won't be reached for those anyway, but
            // guard just in case).
            fs::path filePath = fs::path(docRoot) / path;
            if (fs::exists(filePath) && fs::is_regular_file(filePath)) {
                auto resp = HttpResponse::newNotFoundResponse();
                callback(resp);
                return;
            }

            // Fallback: serve index.html so the SPA router takes over
            auto resp = HttpResponse::newFileResponse(
                (fs::path(docRoot) / "index.html").string());
            callback(resp);
        },
        {Get});

    // Also handle bare "/" explicitly
    app().registerHandler(
        "/",
        [docRoot](const HttpRequestPtr &req,
                  std::function<void(const HttpResponsePtr &)> &&callback) {
            auto resp = HttpResponse::newFileResponse(
                (fs::path(docRoot) / "index.html").string());
            callback(resp);
        },
        {Get});

    // Run HTTP framework,the method will block in the internal event loop
    app().run();
    return 0;
}
