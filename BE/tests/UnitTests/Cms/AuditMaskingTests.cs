using Application.DTOs.Demos;
using Application.DTOs.Users;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services.Demos;
using Application.Interfaces.Services.Users;
using Domain.Entities.System.AuditLogs;
using Domain.Entities.System.Roles;
using Domain.Enums.System.AuditLogs;
using Infrastructure.Persistence.Interceptors;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using UnitTests.TestSupport;

namespace UnitTests.Cms;

/// <summary>Nhật ký thao tác không ghi giá trị cột bí mật (mật khẩu demo, mật khẩu băm, token, secret).</summary>
public sealed class AuditMaskingTests : IAsyncLifetime
{
    private const string Secret = "MatKhauBiMat2026";

    private CmsTestHost _host = null!;

    public async Task InitializeAsync()
    {
        _host = await CmsTestHost.StartAsync();
        await _host.SignInAsync("quanly");
    }

    public async Task DisposeAsync() => await _host.DisposeAsync();

    [Theory]
    [InlineData("PasswordHash", true)]
    [InlineData("DemoPassword", true)]
    [InlineData("RefreshTokenHash", true)]
    [InlineData("TokenHash", true)]
    [InlineData("ClientSecret", true)]
    [InlineData("DemoUrl", false)]
    [InlineData("Username", false)]
    [InlineData("SecretQuestion", false)]
    public void IsMasked_ByPropertyName(string propertyName, bool expected) =>
        Assert.Equal(expected, AuditSaveChangesInterceptor.IsMasked(propertyName));

    [Fact]
    public async Task DemoPassword_IsMaskedOnCreateAndUpdate()
    {
        var industryId = (await _host.CallAsync<IDemoManagementService, IReadOnlyList<DemoListItem>>(s => s.GetListAsync()))[0].Industry.Id;
        var created = await _host.CallAsync<IDemoManagementService, DemoDetail>(s => s.CreateAsync(new CreateDemoRequest
        {
            Number = 19,
            ProjectCode = "fnb-man-hinh-bep",
            Name = "Màn hình Bếp KDS",
            Slug = "man-hinh-bep-kds",
            IndustryId = industryId,
            DemoPassword = Secret
        }));

        await _host.CallAsync<IDemoManagementService, DemoDetail>(s => s.UpdateAsync(created.Id, new SaveDemoRequest
        {
            Number = 19,
            Name = "Màn hình Bếp KDS",
            Slug = "man-hinh-bep-kds",
            IndustryId = industryId,
            DemoPassword = Secret + "Moi"
        }));

        var logs = await AuditLogsAsync("Demo", created.Id.ToString());
        var create = logs.Single(l => l.Action == AuditAction.Create);
        var update = logs.Single(l => l.Action == AuditAction.Update);

        Assert.Contains("\"demoPassword\":\"***\"", create.NewValues);
        Assert.Equal("{\"demoPassword\":\"***\"}", update.OldValues);
        Assert.Equal("{\"demoPassword\":\"***\"}", update.NewValues);
        Assert.All(logs, l => Assert.DoesNotContain(Secret, (l.OldValues ?? "") + (l.NewValues ?? "")));
    }

    [Fact]
    public async Task UserPasswordHash_IsMaskedOnCreate()
    {
        var staffRoleId = await _host.RunAsync(sp => sp.GetRequiredService<IGenericRepository<Role>>()
            .QueryNoTracking().Where(r => r.Code == "STAFF").Select(r => r.Id).SingleAsync());
        await _host.SignInAsync("admin");

        var user = await _host.CallAsync<IUserService, UserDto>(s => s.CreateAsync(new CreateUserRequest
        {
            Username = "nhanvien.moi",
            FullName = "Nguyễn Văn Mới",
            Password = Secret,
            RoleIds = [staffRoleId]
        }));

        var create = (await AuditLogsAsync("User", user.Id.ToString())).Single(l => l.Action == AuditAction.Create);
        Assert.Contains("\"passwordHash\":\"***\"", create.NewValues);
    }

    private Task<List<AuditLog>> AuditLogsAsync(string entityName, string entityId) =>
        _host.RunAsync(sp => sp.GetRequiredService<IGenericRepository<AuditLog>>()
            .QueryNoTracking()
            .Where(l => l.EntityName == entityName && l.EntityId == entityId)
            .ToListAsync());
}
