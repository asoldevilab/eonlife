using DocumentFormat.OpenXml;
using DocumentFormat.OpenXml.Packaging;
using DocumentFormat.OpenXml.Validation;

var total = 0; var bad = 0;
foreach (var path in args)
{
    total++;
    try
    {
        using var doc = SpreadsheetDocument.Open(path, false);
        var validator = new OpenXmlValidator(FileFormatVersions.Microsoft365);
        var errors = validator.Validate(doc).ToList();
        if (errors.Count > 0)
        {
            bad++;
            Console.WriteLine($"{Path.GetFileName(path)}: {errors.Count} errors");
            foreach (var e in errors.Take(12))
                Console.WriteLine($"   [{e.ErrorType}] {e.Part?.Uri} {e.Path?.XPath} :: {e.Description}");
        }
        else Console.WriteLine($"{Path.GetFileName(path)}: OK");
    }
    catch (Exception ex)
    {
        bad++;
        Console.WriteLine($"{Path.GetFileName(path)}: EXCEPTION {ex.GetType().Name}: {ex.Message}");
    }
}
Console.WriteLine($"{total} files, {bad} with problems");
return bad == 0 ? 0 : 1;
