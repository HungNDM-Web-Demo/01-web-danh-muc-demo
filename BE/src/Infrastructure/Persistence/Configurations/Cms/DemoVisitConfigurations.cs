using Domain.Entities.Cms.Demos;
using Domain.Entities.Cms.DemoVisits;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure.Persistence.Configurations.Cms;

public sealed class DemoVisitConfiguration : IEntityTypeConfiguration<DemoVisit>
{
    public void Configure(EntityTypeBuilder<DemoVisit> builder)
    {
        builder.ToTable("Cms_DemoVisits");
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.Property(x => x.VisitorId).HasMaxLength(DemoVisit.VisitorIdMaxLength).IsRequired();
        builder.Property(x => x.Referrer).HasMaxLength(DemoVisit.ReferrerMaxLength);

        builder.HasOne<Demo>().WithMany().HasForeignKey(x => x.DemoId).OnDelete(DeleteBehavior.Cascade);

        // BR-14: tra lượt cùng trình duyệt, cùng demo, cùng loại trong 30 phút; job dọn theo thời điểm.
        builder.HasIndex(x => new { x.DemoId, x.VisitorId, x.Type, x.OccurredAt });
        builder.HasIndex(x => x.OccurredAt);
    }
}

public sealed class DemoVisitStatConfiguration : IEntityTypeConfiguration<DemoVisitStat>
{
    public void Configure(EntityTypeBuilder<DemoVisitStat> builder)
    {
        builder.ToTable("Cms_DemoVisitStats");
        builder.Property(x => x.Id).ValueGeneratedNever();

        builder.HasOne<Demo>().WithMany().HasForeignKey(x => x.DemoId).OnDelete(DeleteBehavior.Cascade);

        // Một dòng mỗi demo mỗi ngày (giờ Việt Nam).
        builder.HasIndex(x => new { x.DemoId, x.Date }).IsUnique();
        builder.HasIndex(x => x.Date);
    }
}
