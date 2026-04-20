#pragma once

#include <drogon/HttpController.h>

namespace api
{
class ReportController : public drogon::HttpController<ReportController>
{
  public:
    METHOD_LIST_BEGIN
    ADD_METHOD_TO(ReportController::createReport, "/api/reports", drogon::Post);
    ADD_METHOD_TO(ReportController::listOpenReports,
                  "/api/reports/open",
                  drogon::Get);
    ADD_METHOD_TO(ReportController::deleteEntryAndResolve,
                  "/api/reports/{1}/delete-entry",
                  drogon::Post);
    ADD_METHOD_TO(ReportController::dismissReport,
                  "/api/reports/{1}/dismiss",
                  drogon::Post);
    METHOD_LIST_END

    void createReport(
        const drogon::HttpRequestPtr &req,
        std::function<void(const drogon::HttpResponsePtr &)> &&callback) const;

    void listOpenReports(
        const drogon::HttpRequestPtr &req,
        std::function<void(const drogon::HttpResponsePtr &)> &&callback) const;

    void deleteEntryAndResolve(
        const drogon::HttpRequestPtr &req,
        std::function<void(const drogon::HttpResponsePtr &)> &&callback,
        int reportId) const;

    void dismissReport(
        const drogon::HttpRequestPtr &req,
        std::function<void(const drogon::HttpResponsePtr &)> &&callback,
        int reportId) const;
};
}  // namespace api
