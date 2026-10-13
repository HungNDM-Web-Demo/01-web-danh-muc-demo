using System.Text.Json;
using Domain.Entities.Cms.Demos;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Infrastructure.Persistence.Configurations.Cms;

public sealed class DemoConfiguration : IEntityTypeConfiguration<Demo>
{
    /// <summary>Danh sách chuỗi lưu dạng mảng JSON (tính năng nổi bật, từ khóa).</summary>
    private static readonly ValueConverter<IReadOnlyList<string>, string> StringListConverter = new(
        list => JsonSerializer.Serialize(list, (JsonSerializerOptions?)null),
        json => DeserializeList(json));

    private static readonly ValueComparer<IReadOnlyList<string>> StringListComparer = new(
        (a, b) => (a ?? Array.Empty<string>()).SequenceEqual(b ?? Array.Empty<string>()),
        list => list.Aggregate(0, (hash, item) => HashCode.Combine(hash, item.GetHashCode())),
        list => list.ToList());

    public void Configure(EntityTypeBuilder<Demo> builder)
    {
        builder.ToTable("Cms_Demos");
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.ProjectCode).HasMaxLength(DemoRules.ProjectCodeMaxLength).IsRequired();
        builder.Property(x => x.Name).HasMaxLength(DemoRules.NameMaxLength).IsRequired();
        builder.Property(x => x.Slug).HasMaxLength(DemoRules.SlugMaxLength).IsRequired();
        builder.Property(x => x.IdeaCode).HasMaxLength(DemoRules.IdeaCodeMaxLength);
        builder.Property(x => x.TargetCustomers).HasMaxLength(DemoRules.TargetCustomersMaxLength);
        builder.Property(x => x.ProblemSolved).HasMaxLength(DemoRules.ProblemSolvedMaxLength);
        builder.Property(x => x.ProductType).HasMaxLength(DemoRules.ProductTypeMaxLength);
        builder.Property(x => x.Devices).HasMaxLength(DemoRules.DevicesMaxLength);
        builder.Property(x => x.ShortDescription).HasMaxLength(DemoRules.ShortDescriptionMaxLength);
        builder.Property(x => x.DemoUrl).HasMaxLength(DemoRules.UrlMaxLength);
        builder.Property(x => x.SwaggerUrl).HasMaxLength(DemoRules.UrlMaxLength);
        builder.Property(x => x.RepoUrl).HasMaxLength(DemoRules.UrlMaxLength);
        builder.Property(x => x.OwnerName).HasMaxLength(DemoRules.OwnerNameMaxLength);
        builder.Property(x => x.DemoPassword).HasMaxLength(DemoRules.DemoPasswordMaxLength);
        builder.Property(x => x.InternalNotes).HasMaxLength(DemoRules.InternalNotesMaxLength);

        // Mô tả chi tiết, kịch bản: nvarchar(max).
        builder.Property(x => x.Description);
        builder.Property(x => x.DemoScript);

        builder.Property(x => x.Features)
            .HasColumnName("FeaturesJson")
            .HasConversion(StringListConverter, StringListComparer)
            .IsRequired();
        builder.Property(x => x.Keywords)
            .HasColumnName("KeywordsJson")
            .HasConversion(StringListConverter, StringListComparer)
            .IsRequired();

        // Mặc định ở DB cho cột bit; entity luôn gán giá trị nên không cần sentinel.
        builder.Property(x => x.RequiresLogin).HasDefaultValue(true).ValueGeneratedNever();
        builder.Property(x => x.IsVisible).HasDefaultValue(false).ValueGeneratedNever();
        builder.Property(x => x.IsFeatured).HasDefaultValue(false).ValueGeneratedNever();

        // Thuộc tính tính toán, không lưu.
        builder.Ignore(x => x.Folder);
        builder.Ignore(x => x.IsPublic);
        builder.Ignore(x => x.IsListed);
        builder.Ignore(x => x.IsComingSoon);
        builder.Ignore(x => x.IsFeaturedOnCatalog);
        builder.Ignore(x => x.EverPublished);
        builder.Ignore(x => x.OrderedScreenshots);
        builder.Ignore(x => x.Cover);
        builder.Ignore(x => x.HasRoomForScreenshot);

        // BR-09, BR-05: số thứ tự, mã dự án, slug không trùng.
        builder.HasIndex(x => x.Number).IsUnique();
        builder.HasIndex(x => x.ProjectCode).IsUnique();
        builder.HasIndex(x => x.Slug).IsUnique();
        builder.HasIndex(x => new { x.IsVisible, x.SortOrder }).HasDatabaseName("IX_Cms_Demos_Visible_Sort");

        // BR-13: không xóa nhóm còn demo.
        builder.HasOne(x => x.Industry)
            .WithMany()
            .HasForeignKey(x => x.IndustryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(x => x.Screenshots).WithOne().HasForeignKey(x => x.DemoId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.Accounts).WithOne().HasForeignKey(x => x.DemoId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.Faqs).WithOne().HasForeignKey(x => x.DemoId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.SlugHistories).WithOne().HasForeignKey(x => x.DemoId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(x => x.StatusHistories).WithOne().HasForeignKey(x => x.DemoId).OnDelete(DeleteBehavior.Cascade);
    }

    private static IReadOnlyList<string> DeserializeList(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return [];

        return JsonSerializer.Deserialize<List<string>>(json, (JsonSerializerOptions?)null) ?? [];
    }
}
