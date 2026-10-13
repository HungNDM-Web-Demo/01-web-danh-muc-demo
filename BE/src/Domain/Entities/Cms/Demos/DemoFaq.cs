using Domain.Base;

namespace Domain.Entities.Cms.Demos;

/// <summary>Câu hỏi khách hay hỏi kèm câu trả lời gợi ý, chỉ dùng nội bộ (<c>Cms_DemoFaqs</c>, FR-20, BR-10).</summary>
public class DemoFaq : BaseEntity, ICreationTracked, IModificationTracked
{
    private DemoFaq()
    {
    }

    internal DemoFaq(Guid demoId, DemoFaqData data, int sortOrder)
    {
        DemoId = demoId;
        Apply(data, sortOrder);
    }

    public Guid DemoId { get; private set; }
    public string Question { get; private set; } = string.Empty;
    public string Answer { get; private set; } = string.Empty;
    public int SortOrder { get; private set; }

    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    internal void Apply(DemoFaqData data, int sortOrder)
    {
        Question = data.Question.Trim();
        Answer = data.Answer.Trim();
        SortOrder = sortOrder;
    }
}

/// <summary>Dữ liệu một câu hỏi thường gặp khi thêm, sửa demo.</summary>
public sealed record DemoFaqData(string Question, string Answer);
