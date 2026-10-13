using System.Buffers.Binary;
using System.Reflection;
using Application.Constants;
using Application.DTOs.Demos;
using Application.Validators.Demos;
using Domain.Entities.Cms.Demos;
using Infrastructure.Implementations.Services.Demos;
using Infrastructure.Implementations.Services.Uploads;
using Infrastructure.Persistence.Seeders;

namespace UnitTests.Cms;

/// <summary>Kiểm tra dữ liệu form demo (TC-24), lý do từ chối ảnh (TC-28), mã quyền dự án có trong file seed.</summary>
public class CmsValidatorAndPermissionTests
{
    [Fact]
    public void ProjectPermissions_AreDeclaredInSeedFiles()
    {
        var seeded = SystemSeedData.Embedded.Permissions.Select(p => p.Code).ToHashSet();

        var missing = typeof(ProjectPermissions)
            .GetNestedTypes(BindingFlags.Public | BindingFlags.Static)
            .SelectMany(t => t.GetFields(BindingFlags.Public | BindingFlags.Static))
            .Where(f => f is { IsLiteral: true } && f.FieldType == typeof(string))
            .Select(f => (string)f.GetRawConstantValue()!)
            .Where(code => !seeded.Contains(code))
            .ToList();

        Assert.Empty(missing);
    }

    [Fact]
    public void Tc24_LongShortDescriptionAndSevenFeatures_ReportBothFields()
    {
        var request = new CreateDemoRequest
        {
            Number = 19,
            ProjectCode = "fnb-man-hinh-bep",
            Name = "Màn hình Bếp KDS",
            Slug = "man-hinh-bep-kds",
            IndustryId = Guid.NewGuid(),
            ShortDescription = new string('a', 170),
            Features = Enumerable.Range(1, 7).Select(i => $"Tính năng {i}").ToList()
        };

        var result = new CreateDemoRequestValidator().Validate(request);

        Assert.Equal(["features", "shortDescription"], result.Errors.Select(e => ToCamel(e.PropertyName)).Order());
        Assert.Contains(result.Errors, e => e.ErrorMessage == "Mô tả ngắn cần dài 50–160 ký tự (hiện có 170)");
        Assert.Contains(result.Errors, e => e.ErrorMessage == "Tối đa 6 tính năng nổi bật");
    }

    [Fact]
    public void CreateValidator_ChecksProjectCode_UpdateValidatorDoesNot()
    {
        var create = new CreateDemoRequest { Number = 1, ProjectCode = "Sai Ma", Name = "Demo", Slug = "demo-moi", IndustryId = Guid.NewGuid() };
        var update = new SaveDemoRequest { Number = 1, ProjectCode = null, Name = "Demo", Slug = "demo-moi", IndustryId = Guid.NewGuid() };

        Assert.Equal("ProjectCode", Assert.Single(new CreateDemoRequestValidator().Validate(create).Errors).PropertyName);
        Assert.True(new SaveDemoRequestValidator().Validate(update).IsValid);
    }

    [Fact]
    public void DuplicateAccountUsername_ReportedOnSecondRow()
    {
        var request = new SaveDemoRequest
        {
            Number = 1,
            Name = "Demo",
            Slug = "demo-moi",
            IndustryId = Guid.NewGuid(),
            Accounts =
            [
                new DemoAccountItem { Username = "thungan", RoleName = "Thu ngân" },
                new DemoAccountItem { Username = "thungan", RoleName = "Thu ngân ca 2" }
            ]
        };

        var failure = Assert.Single(new SaveDemoRequestValidator().Validate(request).Errors);

        Assert.Equal(("Accounts[1].Username", "Tên đăng nhập bị trùng trong demo này"), (failure.PropertyName, failure.ErrorMessage));
    }

    [Theory]
    [InlineData("gif", 500 * 1024, DemoRules.ScreenshotTypeMessage)]
    [InlineData("jpg", 3 * 1024 * 1024, DemoRules.ScreenshotSizeMessage)]
    [InlineData("png-1024", 600 * 1024, DemoRules.ScreenshotWidthMessage)]
    [InlineData("png-1440", 600 * 1024, null)]
    public void Tc28_ScreenshotRejectReasons(string kind, long sizeBytes, string? expected)
    {
        var content = kind switch
        {
            "gif" => "GIF89a"u8.ToArray().Concat(new byte[32]).ToArray(),
            "jpg" => Jpeg(1920, 1080),
            "png-1024" => Png(1024, 640),
            _ => Png(1440, 900)
        };
        var service = new DemoScreenshotService(null!, null!, new ImageInspector(), null!);

        var reason = service.CheckScreenshot(content, sizeBytes, out var image);

        Assert.Equal(expected, reason);
        if (expected is null)
            Assert.Equal(1440, image!.Width);
    }

    private static string ToCamel(string name) => char.ToLowerInvariant(name[0]) + name[1..];

    private static byte[] Png(int width, int height)
    {
        var bytes = new byte[33];
        new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }.CopyTo(bytes, 0);
        BinaryPrimitives.WriteUInt32BigEndian(bytes.AsSpan(8), 13);
        "IHDR"u8.CopyTo(bytes.AsSpan(12));
        BinaryPrimitives.WriteUInt32BigEndian(bytes.AsSpan(16), (uint)width);
        BinaryPrimitives.WriteUInt32BigEndian(bytes.AsSpan(20), (uint)height);
        return bytes;
    }

    private static byte[] Jpeg(int width, int height)
    {
        // SOI, SOF0 (độ dài 17, độ chính xác 8, cao, rộng).
        var bytes = new byte[2 + 2 + 17];
        bytes[0] = 0xFF;
        bytes[1] = 0xD8;
        bytes[2] = 0xFF;
        bytes[3] = 0xC0;
        BinaryPrimitives.WriteUInt16BigEndian(bytes.AsSpan(4), 17);
        bytes[6] = 8;
        BinaryPrimitives.WriteUInt16BigEndian(bytes.AsSpan(7), (ushort)height);
        BinaryPrimitives.WriteUInt16BigEndian(bytes.AsSpan(9), (ushort)width);
        return bytes;
    }
}
