# Rollback to xlsx Library

If you need to revert to the original xlsx implementation, follow these steps:

## Quick Rollback

```bash
# 1. Restore the original file
cp src/services/excelParser.xlsx-backup.ts src/services/excelParser.ts

# 2. Reinstall xlsx and remove exceljs
npm uninstall exceljs
npm install xlsx@^0.18.5

# 3. Test the application
npm run dev
```

## Files Changed

- `src/services/excelParser.ts` - **Main change**: Replaced xlsx with exceljs
- `package.json` - **Dependencies**: Removed xlsx, added exceljs

## What was changed

The migration from xlsx to exceljs maintained:
- ✅ Exact same API and method signatures
- ✅ Phone number handling (scientific notation)
- ✅ Date parsing approach (text-based)
- ✅ All export/import functionality
- ✅ Template generation
- ✅ Column auto-mapping
- ✅ Validation logic

## Security Benefits of ExcelJS

- ✅ No known prototype pollution vulnerabilities
- ✅ No ReDoS vulnerabilities
- ✅ Actively maintained library
- ✅ Regular security updates
- ✅ Better error handling

## Testing After Migration

1. Upload various Excel files (.xlsx, .xls)
2. Test phone number parsing
3. Test date parsing
4. Test template download
5. Test data export
6. Verify column mapping works

If any issues are found, use the rollback steps above and report the specific problem. 