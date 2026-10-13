using Application.DTOs.Industries;
using Domain.Entities.Cms.Industries;

namespace Application.Mappings.Industries;

/// <summary>Ánh xạ viết tay cho nhóm ngành.</summary>
public static class IndustryMappings
{
    /// <summary><paramref name="demoCount"/>: mọi demo của nhóm; <paramref name="visibleDemoCount"/>: demo đang hiển thị, gồm Sắp ra mắt.</summary>
    public static IndustryDto ToDto(this Industry industry, int demoCount, int visibleDemoCount) => new()
    {
        Id = industry.Id,
        Code = industry.Code,
        Name = industry.Name,
        Slug = industry.Slug,
        Icon = industry.Icon,
        Color = industry.Color,
        Description = industry.Description,
        SortOrder = industry.SortOrder,
        DemoCount = demoCount,
        VisibleDemoCount = visibleDemoCount
    };
}
