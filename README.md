# Smart POS

Enterprise-grade Offline-First Point of Sale System for Frappe/ERPNext

## Features

### 🚀 Performance
- Lightning-fast product search and selection
- Optimized for touchscreen devices
- Minimal server round-trips

### 📴 Offline-First Architecture
- Full offline functionality using IndexedDB
- Automatic background synchronization
- Conflict resolution for offline changes
- Works without internet connection

### 💳 Payment Processing
- Multiple payment methods support
- Split payments
- Cash management with drawer kick
- Change calculation

### 🖨️ Hardware Integration
- ESC/POS thermal printer support
- Barcode scanner (HID mode)
- Cash drawer control
- USB and network printers

### 👥 Session Management
- Opening/closing entries
- Cash reconciliation
- Shift reports
- User accountability

### 📱 Progressive Web App (PWA)
- Installable on devices
- Works like native app
- Auto-updates

## Installation

### Prerequisites
- Frappe Framework v15+
- ERPNext v15+
- MariaDB 10.6+
- Node.js 18+

### Install

```bash
# Get the app
bench get-app https://github.com/your-repo/smart_pos.git

# Install on site
bench --site your-site install-app smart_pos

# Build assets
bench build --app smart_pos

# Run migrations
bench --site your-site migrate

# Clear cache
bench --site your-site clear-cache
```

## Configuration

### Smart POS Settings
Navigate to **Smart POS Settings** to configure:
- Default POS Profile
- Offline settings (sync interval, max offline days)
- Hardware settings (printer, barcode scanner)
- UI settings (theme, items per page)

### POS Profile
Set up POS Profiles in ERPNext with:
- Payment methods
- Warehouses
- Customer settings
- Item groups

## Usage

### Opening a Session
1. Go to `/app/pos-terminal`
2. Select a POS Profile
3. Enter opening cash amount
4. Click "Start Session"

### Making a Sale
1. Search or scan products
2. Add items to cart
3. Adjust quantities if needed
4. Click "Pay"
5. Select payment method
6. Enter amount
7. Complete sale

### Closing a Session
1. Click the close session button
2. Enter actual cash count
3. Review summary
4. Confirm closing

## API Reference

### POS Operations
```python
# Get POS Profiles
smart_pos.smart_pos.api.pos_api.get_pos_profiles()

# Open Session
smart_pos.smart_pos.api.pos_api.open_session(pos_profile, opening_cash, notes, device_info)

# Create Invoice
smart_pos.smart_pos.api.pos_api.create_pos_invoice(invoice_data)

# Close Session
smart_pos.smart_pos.api.pos_api.close_session(session_id, actual_cash, notes)
```

### Sync Operations
```python
# Sync offline data
smart_pos.smart_pos.api.sync_api.sync_offline_data(offline_data)

# Get master data for offline
smart_pos.smart_pos.api.sync_api.get_master_data_for_offline(pos_profile)
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| F2 | Focus search |
| F3 | Open payment |
| Escape | Close modal |

## License

MIT

## Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/smart_pos
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### License

mit
