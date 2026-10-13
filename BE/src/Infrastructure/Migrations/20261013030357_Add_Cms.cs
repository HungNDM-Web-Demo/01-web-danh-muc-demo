using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Add_Cms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Cms_Industries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<short>(type: "smallint", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Icon = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    Color = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cms_Industries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Cms_Demos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Number = table.Column<short>(type: "smallint", nullable: false),
                    ProjectCode = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    IndustryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    IdeaCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    TargetCustomers = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    ProblemSolved = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ProductType = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Devices = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ShortDescription = table.Column<string>(type: "nvarchar(160)", maxLength: 160, nullable: true),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FeaturesJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    KeywordsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    DemoUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    SwaggerUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    RepoUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    OwnerName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    RequiresLogin = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    DemoPassword = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    InternalNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    DemoScript = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DevStatus = table.Column<int>(type: "int", nullable: false),
                    IsVisible = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    IsFeatured = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    FirstPublishedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cms_Demos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cms_Demos_Cms_Industries_IndustryId",
                        column: x => x.IndustryId,
                        principalTable: "Cms_Industries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Cms_DemoAccounts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DemoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Username = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    RoleName = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cms_DemoAccounts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cms_DemoAccounts_Cms_Demos_DemoId",
                        column: x => x.DemoId,
                        principalTable: "Cms_Demos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Cms_DemoFaqs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DemoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Question = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Answer = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cms_DemoFaqs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cms_DemoFaqs_Cms_Demos_DemoId",
                        column: x => x.DemoId,
                        principalTable: "Cms_Demos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Cms_DemoScreenshots",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DemoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Url = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Caption = table.Column<string>(type: "nvarchar(125)", maxLength: 125, nullable: true),
                    Width = table.Column<int>(type: "int", nullable: false),
                    Height = table.Column<int>(type: "int", nullable: false),
                    SizeBytes = table.Column<int>(type: "int", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsCover = table.Column<bool>(type: "bit", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cms_DemoScreenshots", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cms_DemoScreenshots_Cms_Demos_DemoId",
                        column: x => x.DemoId,
                        principalTable: "Cms_Demos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Cms_DemoSlugHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DemoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cms_DemoSlugHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cms_DemoSlugHistories_Cms_Demos_DemoId",
                        column: x => x.DemoId,
                        principalTable: "Cms_Demos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Cms_DemoStatusHistories",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DemoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FromStatus = table.Column<int>(type: "int", nullable: true),
                    ToStatus = table.Column<int>(type: "int", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ChangedByName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cms_DemoStatusHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cms_DemoStatusHistories_Cms_Demos_DemoId",
                        column: x => x.DemoId,
                        principalTable: "Cms_Demos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Cms_DemoVisits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DemoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    VisitorId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Device = table.Column<int>(type: "int", nullable: false),
                    Referrer = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    OccurredAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cms_DemoVisits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cms_DemoVisits_Cms_Demos_DemoId",
                        column: x => x.DemoId,
                        principalTable: "Cms_Demos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Cms_DemoVisitStats",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DemoId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Views = table.Column<int>(type: "int", nullable: false),
                    Opens = table.Column<int>(type: "int", nullable: false),
                    MobileViews = table.Column<int>(type: "int", nullable: false),
                    DesktopViews = table.Column<int>(type: "int", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Cms_DemoVisitStats", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Cms_DemoVisitStats_Cms_Demos_DemoId",
                        column: x => x.DemoId,
                        principalTable: "Cms_Demos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Cms_DemoAccounts_DemoId_Username",
                table: "Cms_DemoAccounts",
                columns: new[] { "DemoId", "Username" });

            migrationBuilder.CreateIndex(
                name: "IX_Cms_DemoFaqs_DemoId",
                table: "Cms_DemoFaqs",
                column: "DemoId");

            migrationBuilder.CreateIndex(
                name: "IX_Cms_Demos_IndustryId",
                table: "Cms_Demos",
                column: "IndustryId");

            migrationBuilder.CreateIndex(
                name: "IX_Cms_Demos_Number",
                table: "Cms_Demos",
                column: "Number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cms_Demos_ProjectCode",
                table: "Cms_Demos",
                column: "ProjectCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cms_Demos_Slug",
                table: "Cms_Demos",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cms_Demos_Visible_Sort",
                table: "Cms_Demos",
                columns: new[] { "IsVisible", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Cms_DemoScreenshots_DemoId_SortOrder",
                table: "Cms_DemoScreenshots",
                columns: new[] { "DemoId", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_Cms_DemoSlugHistories_DemoId",
                table: "Cms_DemoSlugHistories",
                column: "DemoId");

            migrationBuilder.CreateIndex(
                name: "IX_Cms_DemoSlugHistories_Slug",
                table: "Cms_DemoSlugHistories",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cms_DemoStatusHistories_DemoId_ChangedAt",
                table: "Cms_DemoStatusHistories",
                columns: new[] { "DemoId", "ChangedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Cms_DemoVisits_DemoId_VisitorId_Type_OccurredAt",
                table: "Cms_DemoVisits",
                columns: new[] { "DemoId", "VisitorId", "Type", "OccurredAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Cms_DemoVisits_OccurredAt",
                table: "Cms_DemoVisits",
                column: "OccurredAt");

            migrationBuilder.CreateIndex(
                name: "IX_Cms_DemoVisitStats_Date",
                table: "Cms_DemoVisitStats",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_Cms_DemoVisitStats_DemoId_Date",
                table: "Cms_DemoVisitStats",
                columns: new[] { "DemoId", "Date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cms_Industries_Code",
                table: "Cms_Industries",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Cms_Industries_Slug",
                table: "Cms_Industries",
                column: "Slug",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Cms_DemoAccounts");

            migrationBuilder.DropTable(
                name: "Cms_DemoFaqs");

            migrationBuilder.DropTable(
                name: "Cms_DemoScreenshots");

            migrationBuilder.DropTable(
                name: "Cms_DemoSlugHistories");

            migrationBuilder.DropTable(
                name: "Cms_DemoStatusHistories");

            migrationBuilder.DropTable(
                name: "Cms_DemoVisits");

            migrationBuilder.DropTable(
                name: "Cms_DemoVisitStats");

            migrationBuilder.DropTable(
                name: "Cms_Demos");

            migrationBuilder.DropTable(
                name: "Cms_Industries");
        }
    }
}
