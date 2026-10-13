using Domain.Entities.Cms.Industries;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations.Cms;

public sealed class IndustryConfiguration : IEntityTypeConfiguration<Industry>
{
    public void Configure(EntityTypeBuilder<Industry> builder)
    {
        builder.ToTable("Cms_Industries");
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.Name).HasMaxLength(Industry.NameMaxLength).IsRequired();
        builder.Property(x => x.Slug).HasMaxLength(Industry.SlugMaxLength).IsRequired();
        builder.Property(x => x.Icon).HasMaxLength(Industry.IconMaxLength);
        builder.Property(x => x.Color).HasMaxLength(Industry.ColorMaxLength).IsRequired();
        builder.Property(x => x.Description).HasMaxLength(Industry.DescriptionMaxLength);

        // BR-13: mã và slug không trùng.
        builder.HasIndex(x => x.Code).IsUnique();
        builder.HasIndex(x => x.Slug).IsUnique();
    }
}
