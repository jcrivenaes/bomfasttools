# Reference Images

This directory is for storing reference images that can be used for comparison with calculation results.

## Usage

### Automatic Reference Loading
The interface automatically looks for reference images that match the selected JSON case:
- If you select `hfast_svv_2025_b1.json`, it will look for `hfast_svv_2025_b1.png`
- If you select `hfast_svv_2025.json`, it will look for `hfast_svv_2025.png`

### Manual Loading
You can also:
1. Click "Last referanse for valgt case" to manually load the reference for the current case
2. Use "Last opp referansebilde" to upload any custom image

## File Naming Convention

Reference images should have the same name as their corresponding JSON files:

- `hfast_svv_2025.json` → `hfast_svv_2025.png`
- `hfast_svv_2025_b1.json` → `hfast_svv_2025_b1.png`
- `custom_scenario.json` → `custom_scenario.png`

## Image Guidelines

- **Format**: PNG recommended (JPG also supported)
- **Content**: Screenshots from official documentation, previous calculations, or expected results
- **Size**: The interface will automatically scale images to fit

## Workflow

1. **Add Reference**: Place your reference screenshot with the matching name in this directory
2. **Select Case**: Choose your JSON case from the dropdown
3. **Auto-Load**: The reference image will automatically appear (if it exists)
4. **Compare**: Run calculations and compare with the reference image
