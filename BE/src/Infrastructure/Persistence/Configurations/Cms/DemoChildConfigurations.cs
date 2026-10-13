using Domain.Entities.Cms.Demos;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations.Cms;

public sealed class DemoScreenshotConfiguration : IEntityTypeConfiguration<DemoScreenshot>
{
    public void Configure(EntityTypeBuilder<DemoScreenshot> builder)
    {
        builder.ToTable("Cms_DemoScreenshots");
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.Url).HasMaxLength(DemoRules.ScreenshotUrlMaxLength).IsRequired();
        builder.Property(x => x.Caption).HasMaxLength(DemoRules.CaptionMaxLength);
        builder.HasIndex(x => new { x.DemoId, x.SortOrder });
    }
}

public sealed class DemoAccountConfiguration : IEntityTypeConfiguration<DemoAccount>
{
    public void Configure(EntityTypeBuilder<DemoAccount> builder)
    {
        builder.ToTable("Cms_DemoAccounts");
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.Username).HasMaxLength(DemoRules.AccountUsernameMaxLength).IsRequired();
        builder.Property(x => x.RoleName).HasMaxLength(DemoRules.AccountRoleNameMaxLength).IsRequired();
        builder.Property(x => x.Purpose).HasMaxLength(DemoRules.AccountPurposeMaxLength);

        // BR-16: tên đăng nhập không trùng trong một demo, kiểm tra khi lưu. Không đặt unique index vì danh sách được
        // cập nhật tại chỗ theo vị trí: đổi chỗ hai tài khoản trong một lần lưu sẽ vướng ràng buộc tạm thời.
        builder.HasIndex(x => new { x.DemoId, x.Username });
    }
}

public sealed class DemoFaqConfiguration : IEntityTypeConfiguration<DemoFaq>
{
    public void Configure(EntityTypeBuilder<DemoFaq> builder)
    {
        builder.ToTable("Cms_DemoFaqs");
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.Question).HasMaxLength(DemoRules.FaqQuestionMaxLength).IsRequired();
        builder.Property(x => x.Answer).HasMaxLength(DemoRules.FaqAnswerMaxLength).IsRequired();
        builder.HasIndex(x => x.DemoId);
    }
}

public sealed class DemoSlugHistoryConfiguration : IEntityTypeConfiguration<DemoSlugHistory>
{
    public void Configure(EntityTypeBuilder<DemoSlugHistory> builder)
    {
        builder.ToTable("Cms_DemoSlugHistories");
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.Slug).HasMaxLength(DemoRules.SlugMaxLength).IsRequired();

        // BR-06: slug cũ không được dùng lại cho demo khác.
        builder.HasIndex(x => x.Slug).IsUnique();
        builder.HasIndex(x => x.DemoId);
    }
}

public sealed class DemoStatusHistoryConfiguration : IEntityTypeConfiguration<DemoStatusHistory>
{
    public void Configure(EntityTypeBuilder<DemoStatusHistory> builder)
    {
        builder.ToTable("Cms_DemoStatusHistories");
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.Reason).HasMaxLength(DemoRules.ReasonMaxLength);
        builder.Property(x => x.ChangedByName).HasMaxLength(DemoRules.ChangedByNameMaxLength).IsRequired();
        builder.HasIndex(x => new { x.DemoId, x.ChangedAt });
    }
}
