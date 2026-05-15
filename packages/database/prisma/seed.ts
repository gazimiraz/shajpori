import { PrismaClient, UserRole, AccountType, BarcodeType, ProductStatus, StockStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Super Admin
  const adminPassword = await bcrypt.hash('Admin@123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@shaj.com' },
    update: {},
    create: {
      email: 'admin@shaj.com',
      passwordHash: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      emailVerified: true,
    },
  });
  console.log('✅ Admin user created:', admin.email);

  // Default Store
  const store = await prisma.store.upsert({
    where: { slug: 'shaj-main' },
    update: {},
    create: {
      name: 'Shaj Fashion',
      slug: 'shaj-main',
      email: 'store@shaj.com',
      phone: '+8801700000000',
      currency: 'BDT',
      timezone: 'Asia/Dhaka',
      isActive: true,
      isPOS: true,
    },
  });
  console.log('✅ Store created:', store.name);

  // Default Warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-MAIN' },
    update: {},
    create: {
      storeId: store.id,
      name: 'Main Warehouse',
      code: 'WH-MAIN',
      address: 'Dhaka, Bangladesh',
      city: 'Dhaka',
      isDefault: true,
    },
  });
  console.log('✅ Warehouse created:', warehouse.name);

  // Tax Classes
  const standardTax = await prisma.taxClass.upsert({
    where: { name: 'Standard 15%' },
    update: {},
    create: {
      name: 'Standard 15%',
      rate: 15,
      isDefault: true,
    },
  });

  // Chart of Accounts
  const accounts = [
    { code: '1000', name: 'Assets', type: AccountType.ASSET, isSystem: true },
    { code: '1100', name: 'Cash & Bank', type: AccountType.ASSET, isSystem: true },
    { code: '1200', name: 'Accounts Receivable', type: AccountType.ASSET, isSystem: true },
    { code: '1300', name: 'Inventory', type: AccountType.ASSET, isSystem: true },
    { code: '2000', name: 'Liabilities', type: AccountType.LIABILITY, isSystem: true },
    { code: '2100', name: 'Accounts Payable', type: AccountType.LIABILITY, isSystem: true },
    { code: '2200', name: 'Tax Payable', type: AccountType.LIABILITY, isSystem: true },
    { code: '3000', name: 'Equity', type: AccountType.EQUITY, isSystem: true },
    { code: '4000', name: 'Revenue', type: AccountType.REVENUE, isSystem: true },
    { code: '4100', name: 'Sales Revenue', type: AccountType.REVENUE, isSystem: true },
    { code: '4200', name: 'Other Revenue', type: AccountType.REVENUE, isSystem: true },
    { code: '5000', name: 'Expenses', type: AccountType.EXPENSE, isSystem: true },
    { code: '5100', name: 'Cost of Goods Sold', type: AccountType.EXPENSE, isSystem: true },
    { code: '5200', name: 'Operating Expenses', type: AccountType.EXPENSE, isSystem: true },
    { code: '5300', name: 'Salaries & Wages', type: AccountType.EXPENSE, isSystem: true },
  ];

  for (const account of accounts) {
    await prisma.accountChart.upsert({
      where: { code: account.code },
      update: {},
      create: account,
    });
  }
  console.log('✅ Chart of accounts created');

  // Categories
  const categories = [
    { name: "Women's Fashion", slug: 'womens-fashion' },
    { name: "Men's Fashion", slug: 'mens-fashion' },
    { name: "Kids & Baby", slug: 'kids-baby' },
    { name: 'Accessories', slug: 'accessories' },
    { name: 'Footwear', slug: 'footwear' },
    { name: 'Beauty & Personal Care', slug: 'beauty-personal-care' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, isActive: true },
    });
  }
  console.log('✅ Categories created');

  // Brands
  const brands = [
    { name: 'Shaj Originals', slug: 'shaj-originals' },
    { name: 'Urban Style', slug: 'urban-style' },
    { name: 'Elegance', slug: 'elegance' },
  ];

  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { slug: brand.slug },
      update: {},
      create: { ...brand, isActive: true },
    });
  }
  console.log('✅ Brands created');

  // Attributes
  await prisma.productAttribute.upsert({
    where: { slug: 'size' },
    update: {},
    create: {
      name: 'Size',
      slug: 'size',
      type: 'select',
      values: {
        create: ['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((v, i) => ({ value: v, sortOrder: i })),
      },
    },
  });

  await prisma.productAttribute.upsert({
    where: { slug: 'color' },
    update: {},
    create: {
      name: 'Color',
      slug: 'color',
      type: 'color',
      values: {
        create: [
          { value: 'Black', colorHex: '#000000', sortOrder: 0 },
          { value: 'White', colorHex: '#FFFFFF', sortOrder: 1 },
          { value: 'Red', colorHex: '#EF4444', sortOrder: 2 },
          { value: 'Blue', colorHex: '#3B82F6', sortOrder: 3 },
          { value: 'Green', colorHex: '#22C55E', sortOrder: 4 },
        ],
      },
    },
  });
  console.log('✅ Product attributes created');

  // System Settings
  const settings = [
    { key: 'store.name', value: '"Shaj Fashion"', group: 'general', isPublic: true },
    { key: 'store.currency', value: '"BDT"', group: 'general', isPublic: true },
    { key: 'store.timezone', value: '"Asia/Dhaka"', group: 'general', isPublic: true },
    { key: 'store.country', value: '"BD"', group: 'general', isPublic: true },
    { key: 'inventory.low_stock_threshold', value: '5', group: 'inventory', isPublic: false },
    { key: 'order.auto_confirm', value: 'false', group: 'orders', isPublic: false },
    { key: 'loyalty.points_per_taka', value: '1', group: 'marketing', isPublic: true },
    { key: 'loyalty.redeem_rate', value: '0.01', group: 'marketing', isPublic: true },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: JSON.parse(setting.value),
        group: setting.group,
        isPublic: setting.isPublic,
      },
    });
  }
  console.log('✅ System settings created');

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
