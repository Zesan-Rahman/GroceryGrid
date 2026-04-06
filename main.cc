#include <drogon/drogon.h>

using namespace drogon;

int main(int argc, char *argv[]) {
    // load config
    app().loadConfigFile("config.json");

    // Run HTTP framework,the method will block in the internal event loop
    app().run();
    return 0;
}
