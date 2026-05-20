import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Shop } from '../../modules/shops/entities/shop.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Branch } from '../../modules/branches/entities/branch.entity';
import { Location } from '../../modules/locations/entities/location.entity';
import { Category } from '../../modules/categories/entities/category.entity';
import { Supplier } from '../../modules/suppliers/entities/supplier.entity';
import { Customer } from '../../modules/customers/entities/customer.entity';
import { Part } from '../../modules/parts/entities/part.entity';
import { Stock } from '../../modules/stock/entities/stock.entity';
import { StockMovement } from '../../modules/stock/entities/stock-movement.entity';
import { Purchase } from '../../modules/purchases/entities/purchase.entity';
import { PurchaseItem } from '../../modules/purchases/entities/purchase-item.entity';
import { Sale } from '../../modules/sales/entities/sale.entity';
import { SaleItem } from '../../modules/sales/entities/sale-item.entity';
import { Expense } from '../../modules/expenses/entities/expense.entity';
import { LedgerEntry } from '../../modules/ledger/entities/ledger-entry.entity';
import {
  UserRole, PaymentMethod, PurchaseStatus, SaleStatus,
  StockMovementType, LocationType, LedgerEntityType, LedgerEntryType,
} from '@autoparts/shared-types';

// ─── helpers ────────────────────────────────────────────────────────────────

let invoiceCounter = 1;
const inv = (prefix: string) => `${prefix}-SEED-${String(invoiceCounter++).padStart(4, '0')}`;

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const days = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

// ─── main ────────────────────────────────────────────────────────────────────

export async function runFullSeed(ds: DataSource): Promise<void> {
  // ── 1. SUPER ADMIN ────────────────────────────────────────────────────────
  const userRepo     = ds.getRepository(User);
  const shopRepo     = ds.getRepository(Shop);
  const branchRepo   = ds.getRepository(Branch);
  const locationRepo = ds.getRepository(Location);
  const catRepo      = ds.getRepository(Category);
  const supplierRepo = ds.getRepository(Supplier);
  const customerRepo = ds.getRepository(Customer);
  const partRepo     = ds.getRepository(Part);
  const stockRepo    = ds.getRepository(Stock);
  const movRepo      = ds.getRepository(StockMovement);
  const purchRepo    = ds.getRepository(Purchase);
  const purchItemRepo = ds.getRepository(PurchaseItem);
  const saleRepo     = ds.getRepository(Sale);
  const saleItemRepo = ds.getRepository(SaleItem);
  const expRepo      = ds.getRepository(Expense);
  const ledgerRepo   = ds.getRepository(LedgerEntry);

  const pw = async (plain: string) => bcrypt.hash(plain, 12);

  // Super admin
  let superAdmin = await userRepo.findOne({ where: { email: 'admin@autoparts.pk' } });
  if (!superAdmin) {
    superAdmin = await userRepo.save(userRepo.create({
      name: 'Super Admin',
      email: 'admin@autoparts.pk',
      password: await pw('Admin@123'),
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      shopId: null,
    }));
    console.log('  ✓ Super Admin created');
  } else {
    console.log('  · Super Admin already exists');
  }

  // ── 2. SHOPS ──────────────────────────────────────────────────────────────
  let shopA = await shopRepo.findOne({ where: { slug: 'al-rahim-auto-parts' } });
  if (!shopA) {
    shopA = await shopRepo.save(shopRepo.create({
      name: 'Al-Rahim Auto Parts',
      slug: 'al-rahim-auto-parts',
      ownerEmail: 'owner@alrahim.pk',
      phone: '0300-1234567',
      address: 'Shop 12, Hall Road, Lahore',
      isActive: true,
    }));
    console.log('  ✓ Shop A created:', shopA.name);
  } else {
    console.log('  · Shop A already exists');
  }

  let shopB = await shopRepo.findOne({ where: { slug: 'bashir-spare-parts' } });
  if (!shopB) {
    shopB = await shopRepo.save(shopRepo.create({
      name: 'Bashir Spare Parts',
      slug: 'bashir-spare-parts',
      ownerEmail: 'owner@bashir.pk',
      phone: '0321-9876543',
      address: 'Plot 45, Tariq Road, Karachi',
      isActive: true,
    }));
    console.log('  ✓ Shop B created:', shopB.name);
  } else {
    console.log('  · Shop B already exists');
  }

  // ── 3. USERS ──────────────────────────────────────────────────────────────
  const ensureUser = async (data: {
    name: string; email: string; password: string;
    role: UserRole; shopId: string | null; branchId?: string | null;
  }) => {
    const existing = await userRepo.findOne({ where: { email: data.email } });
    if (existing) return existing;
    const u = await userRepo.save(userRepo.create({
      ...data,
      password: await pw(data.password),
      isActive: true,
    }));
    console.log(`  ✓ User: ${u.email}`);
    return u;
  };

  const adminA    = await ensureUser({ name: 'Rahim Admin',   email: 'admin@alrahim.pk',   password: 'Admin@123',   role: UserRole.ADMIN,   shopId: shopA.id });
  const managerA  = await ensureUser({ name: 'Rahim Manager', email: 'manager@alrahim.pk', password: 'Manager@123', role: UserRole.MANAGER, shopId: shopA.id });
  const cashierA  = await ensureUser({ name: 'Rahim Cashier', email: 'cashier@alrahim.pk', password: 'Cashier@123', role: UserRole.CASHIER, shopId: shopA.id });
  const adminB    = await ensureUser({ name: 'Bashir Admin',  email: 'admin@bashir.pk',    password: 'Admin@123',   role: UserRole.ADMIN,   shopId: shopB.id });
  const cashierB  = await ensureUser({ name: 'Bashir Cashier',email: 'cashier@bashir.pk',  password: 'Cashier@123', role: UserRole.CASHIER, shopId: shopB.id });

  // ── 4. BRANCHES ───────────────────────────────────────────────────────────
  const ensureBranch = async (data: { name: string; shopId: string; city: string; address?: string; phone?: string }) => {
    const existing = await branchRepo.findOne({ where: { name: data.name, shopId: data.shopId } });
    if (existing) return existing;
    const b = await branchRepo.save(branchRepo.create({ ...data, isActive: true }));
    console.log(`  ✓ Branch: ${b.name}`);
    return b;
  };

  const branchA1 = await ensureBranch({ name: 'Hall Road Main Branch',  shopId: shopA.id, city: 'Lahore',  address: 'Shop 12, Hall Road, Lahore',      phone: '042-1234567' });
  const branchA2 = await ensureBranch({ name: 'Township Branch',         shopId: shopA.id, city: 'Lahore',  address: 'Block D-1, Township, Lahore',      phone: '042-7654321' });
  const branchB1 = await ensureBranch({ name: 'Tariq Road Main Branch',  shopId: shopB.id, city: 'Karachi', address: 'Plot 45, Tariq Road, Karachi',     phone: '021-9876543' });

  // update cashier branch assignments
  await userRepo.update(cashierA.id, { branchId: branchA1.id });
  await userRepo.update(cashierB.id, { branchId: branchB1.id });

  // ── 5. LOCATIONS ──────────────────────────────────────────────────────────
  const ensureLoc = async (data: {
    name: string; shopId: string; branchId: string;
    type: LocationType; parentId?: string | null;
  }) => {
    const existing = await locationRepo.findOne({ where: { name: data.name, shopId: data.shopId, branchId: data.branchId } });
    if (existing) return existing;
    const l = await locationRepo.save(locationRepo.create({ ...data, isActive: true }));
    console.log(`  ✓ Location: ${l.name}`);
    return l;
  };

  // Shop A — Main Branch
  const locA_WH   = await ensureLoc({ name: 'Main Warehouse',  shopId: shopA.id, branchId: branchA1.id, type: LocationType.WAREHOUSE });
  const locA_ShA  = await ensureLoc({ name: 'Shelf A',         shopId: shopA.id, branchId: branchA1.id, type: LocationType.SHELF,     parentId: locA_WH.id });
  const locA_ShB  = await ensureLoc({ name: 'Shelf B',         shopId: shopA.id, branchId: branchA1.id, type: LocationType.SHELF,     parentId: locA_WH.id });
  const locA_Ctr  = await ensureLoc({ name: 'Display Counter', shopId: shopA.id, branchId: branchA1.id, type: LocationType.SHELF });
  // Shop A — Township Branch
  const locA_TP   = await ensureLoc({ name: 'Township Store',  shopId: shopA.id, branchId: branchA2.id, type: LocationType.WAREHOUSE });
  // Shop B
  const locB_WH   = await ensureLoc({ name: 'Karachi Warehouse', shopId: shopB.id, branchId: branchB1.id, type: LocationType.WAREHOUSE });
  const locB_ShK  = await ensureLoc({ name: 'Shelf K-1',         shopId: shopB.id, branchId: branchB1.id, type: LocationType.SHELF,     parentId: locB_WH.id });

  // ── 6. CATEGORIES ─────────────────────────────────────────────────────────
  const ensureCat = async (data: {
    nameEn: string; nameUr?: string; shopId: string; parentId?: string | null; description?: string;
  }) => {
    const slug = slugify(data.nameEn) + '-' + data.shopId.slice(0, 8);
    const existing = await catRepo.findOne({ where: { slug, shopId: data.shopId } });
    if (existing) return existing;
    const c = await catRepo.save(catRepo.create({ ...data, slug, isActive: true }));
    console.log(`  ✓ Category: ${c.nameEn}`);
    return c;
  };

  // Shop A categories
  const catA_Eng  = await ensureCat({ nameEn: 'Engine Parts',          nameUr: 'انجن پارٹس',       shopId: shopA.id });
  const catA_Fil  = await ensureCat({ nameEn: 'Filters',               nameUr: 'فلٹرز',            shopId: shopA.id, parentId: catA_Eng.id });
  const catA_Pis  = await ensureCat({ nameEn: 'Pistons & Rings',        nameUr: 'پسٹن',             shopId: shopA.id, parentId: catA_Eng.id });
  const catA_Sus  = await ensureCat({ nameEn: 'Suspension & Steering',  nameUr: 'سسپنشن',           shopId: shopA.id });
  const catA_Brk  = await ensureCat({ nameEn: 'Brakes',                nameUr: 'بریک',             shopId: shopA.id });
  const catA_Elc  = await ensureCat({ nameEn: 'Electrical',            nameUr: 'الیکٹریکل',        shopId: shopA.id });

  // Shop B categories (same names — tests isolation)
  const catB_Eng  = await ensureCat({ nameEn: 'Engine Parts',          shopId: shopB.id });
  const catB_Bdy  = await ensureCat({ nameEn: 'Body Parts',            shopId: shopB.id });
  const catB_Coo  = await ensureCat({ nameEn: 'Cooling System',        shopId: shopB.id });

  // ── 7. SUPPLIERS ──────────────────────────────────────────────────────────
  const ensureSupplier = async (data: { name: string; shopId: string; phone?: string; email?: string; address?: string; ntn?: string }) => {
    const existing = await supplierRepo.findOne({ where: { name: data.name, shopId: data.shopId } });
    if (existing) return existing;
    const s = await supplierRepo.save(supplierRepo.create({ ...data, balance: 0, isActive: true }));
    console.log(`  ✓ Supplier: ${s.name}`);
    return s;
  };

  const supA1 = await ensureSupplier({ name: 'Ali Traders',              shopId: shopA.id, phone: '0300-5556666', email: 'ali@traders.pk',       address: 'Akbari Mandi, Lahore',        ntn: '1234567-1' });
  const supA2 = await ensureSupplier({ name: 'Pakistan Auto Parts Co.',  shopId: shopA.id, phone: '0321-7778888', email: 'info@pakautop.pk',      address: 'Brandreth Road, Lahore',      ntn: '2345678-2' });
  const supA3 = await ensureSupplier({ name: 'Honda Genuine Parts',      shopId: shopA.id, phone: '042-1112222',  email: 'genuine@honda.com.pk',  address: 'Honda Point, Lahore' });
  const supB1 = await ensureSupplier({ name: 'Karachi Motor Parts',      shopId: shopB.id, phone: '021-4445555', email: 'kmp@motors.pk',         address: 'Shershah, Karachi' });
  const supB2 = await ensureSupplier({ name: 'Ahmed Brothers Trading',   shopId: shopB.id, phone: '0333-9990000', email: 'ahmed@brothers.pk' });

  // ── 8. CUSTOMERS ──────────────────────────────────────────────────────────
  const ensureCustomer = async (data: { name: string; shopId: string; phone?: string; email?: string; address?: string; cnic?: string; creditLimit?: number }) => {
    const existing = await customerRepo.findOne({ where: { name: data.name, shopId: data.shopId } });
    if (existing) return existing;
    const c = await customerRepo.save(customerRepo.create({ ...data, balance: 0, isActive: true }));
    console.log(`  ✓ Customer: ${c.name}`);
    return c;
  };

  const cusA1 = await ensureCustomer({ name: 'Ahmed Khan',      shopId: shopA.id, phone: '0312-1234567', address: 'Model Town, Lahore',     cnic: '35201-1234567-1', creditLimit: 50000 });
  const cusA2 = await ensureCustomer({ name: 'Usman Motors',    shopId: shopA.id, phone: '0333-7654321', address: 'Ferozpur Road, Lahore',  creditLimit: 100000 });
  const cusA3 = await ensureCustomer({ name: 'Malik Auto Works',shopId: shopA.id, phone: '0321-9876543', address: 'Raiwind Road, Lahore',   creditLimit: 75000 });
  const cusB1 = await ensureCustomer({ name: 'Karachi Workshop', shopId: shopB.id, phone: '021-3456789', address: 'SITE Area, Karachi' });
  const cusB2 = await ensureCustomer({ name: 'Farooq Brothers',  shopId: shopB.id, phone: '0345-6789012' });

  // ── 9. PARTS ──────────────────────────────────────────────────────────────
  const ensurePart = async (data: {
    partNumber: string; nameEn: string; nameUr?: string; shopId: string;
    categoryId?: string | null; brand?: string; buyPrice: number; sellPrice: number;
    minStock?: number; unit?: string; barcode?: string;
  }) => {
    const existing = await partRepo.findOne({ where: { partNumber: data.partNumber, shopId: data.shopId } });
    if (existing) return existing;
    const p = await partRepo.save(partRepo.create({ ...data, isActive: true, unit: data.unit ?? 'piece', minStock: data.minStock ?? 5 }));
    console.log(`  ✓ Part: ${p.nameEn} (${p.partNumber})`);
    return p;
  };

  // Shop A parts
  const pA1  = await ensurePart({ partNumber: 'OFL-001', nameEn: 'Oil Filter (Universal)',    nameUr: 'آئل فلٹر',       shopId: shopA.id, categoryId: catA_Fil.id, brand: 'Mann',    buyPrice: 150,  sellPrice: 280,  minStock: 10,  barcode: 'PK-OFL-001' });
  const pA2  = await ensurePart({ partNumber: 'AFL-001', nameEn: 'Air Filter (Universal)',    nameUr: 'ایئر فلٹر',      shopId: shopA.id, categoryId: catA_Fil.id, brand: 'Mann',    buyPrice: 200,  sellPrice: 380,  minStock: 8,   barcode: 'PK-AFL-001' });
  const pA3  = await ensurePart({ partNumber: 'SPK-001', nameEn: 'Spark Plug NGK',            nameUr: 'اسپارک پلگ',     shopId: shopA.id, categoryId: catA_Eng.id, brand: 'NGK',     buyPrice: 80,   sellPrice: 160,  minStock: 20 });
  const pA4  = await ensurePart({ partNumber: 'BRK-001', nameEn: 'Brake Pads Front (Set)',    nameUr: 'بریک پیڈ',       shopId: shopA.id, categoryId: catA_Brk.id, brand: 'TRW',     buyPrice: 800,  sellPrice: 1500, minStock: 5 });
  const pA5  = await ensurePart({ partNumber: 'SUS-001', nameEn: 'Shock Absorber Front',      nameUr: 'شاک ابزاربر',    shopId: shopA.id, categoryId: catA_Sus.id, brand: 'Gabriel', buyPrice: 2500, sellPrice: 4500, minStock: 3 });
  const pA6  = await ensurePart({ partNumber: 'ELC-001', nameEn: 'Battery 65Ah (AGS)',        nameUr: 'بیٹری',          shopId: shopA.id, categoryId: catA_Elc.id, brand: 'AGS',     buyPrice: 5500, sellPrice: 8500, minStock: 2 });
  const pA7  = await ensurePart({ partNumber: 'ENG-001', nameEn: 'Engine Oil 5W30 1L',        nameUr: 'انجن آئل',       shopId: shopA.id, categoryId: catA_Eng.id, brand: 'Castrol', buyPrice: 350,  sellPrice: 650,  minStock: 30, unit: 'litre' });
  const pA8  = await ensurePart({ partNumber: 'ENG-002', nameEn: 'Timing Belt Kit',           nameUr: 'ٹائمنگ بیلٹ',   shopId: shopA.id, categoryId: catA_Eng.id, brand: 'Gates',   buyPrice: 450,  sellPrice: 850,  minStock: 5 });
  const pA9  = await ensurePart({ partNumber: 'ENG-003', nameEn: 'Coolant 1L (Green)',        nameUr: 'کولنٹ',          shopId: shopA.id, categoryId: catA_Eng.id, brand: 'Prestone',buyPrice: 250,  sellPrice: 480,  minStock: 10, unit: 'litre' });
  const pA10 = await ensurePart({ partNumber: 'ENG-004', nameEn: 'Clutch Plate Suzuki Mehran',nameUr: 'کلچ پلیٹ',       shopId: shopA.id, categoryId: catA_Pis.id, brand: 'LUK',     buyPrice: 1200, sellPrice: 2200, minStock: 3 });

  // Shop B parts
  const pB1  = await ensurePart({ partNumber: 'OFL-T01', nameEn: 'Oil Filter Toyota',  shopId: shopB.id, categoryId: catB_Eng.id, brand: 'Denso', buyPrice: 160, sellPrice: 300, minStock: 8 });
  const pB2  = await ensurePart({ partNumber: 'FP-S01',  nameEn: 'Fuel Pump Suzuki',   shopId: shopB.id, categoryId: catB_Eng.id, brand: 'Suzuki Genuine', buyPrice: 1800, sellPrice: 3500, minStock: 3 });
  const pB3  = await ensurePart({ partNumber: 'BDY-001', nameEn: 'Front Bumper Guard', shopId: shopB.id, categoryId: catB_Bdy.id, buyPrice: 600, sellPrice: 1200, minStock: 5 });

  // ── 10. STOCK & MOVEMENTS (via completed purchases) ───────────────────────

  const upsertStock = async (partId: string, locationId: string, shopId: string, qty: number) => {
    let s = await stockRepo.findOne({ where: { partId, locationId } });
    if (!s) {
      s = stockRepo.create({ partId, locationId, shopId, quantity: 0 });
    }
    s.quantity += qty;
    return stockRepo.save(s);
  };

  const addMovement = async (data: {
    partId: string; shopId: string; type: StockMovementType;
    toLocationId?: string | null; fromLocationId?: string | null;
    quantity: number; referenceId?: string; createdById?: string; notes?: string;
  }) => movRepo.save(movRepo.create(data));

  // ── 11. PURCHASES (Shop A) ────────────────────────────────────────────────

  // PO-1: Ali Traders — RECEIVED (seeds stock)
  const po1Exists = await purchRepo.findOne({ where: { invoiceNo: 'PUR-SEED-0001', shopId: shopA.id } });
  if (!po1Exists) {
    const po1Items = [
      { partId: pA1.id, locationId: locA_ShA.id, quantity: 50, unitPrice: 150, total: 7500  },
      { partId: pA2.id, locationId: locA_ShA.id, quantity: 30, unitPrice: 200, total: 6000  },
      { partId: pA3.id, locationId: locA_ShB.id, quantity: 100,unitPrice: 80,  total: 8000  },
      { partId: pA7.id, locationId: locA_ShB.id, quantity: 60, unitPrice: 350, total: 21000 },
    ];
    const po1Total   = po1Items.reduce((s, i) => s + i.total, 0);
    const po1Paid    = po1Total; // fully paid
    const po1 = await purchRepo.save(purchRepo.create({
      supplierId: supA1.id, invoiceNo: 'PUR-SEED-0001',
      date: days(20), total: po1Total, discount: 0, tax: 0,
      netTotal: po1Total, paidAmount: po1Paid, paymentMethod: PaymentMethod.CASH,
      status: PurchaseStatus.RECEIVED, shopId: shopA.id, branchId: branchA1.id,
      createdById: adminA.id, notes: 'Opening stock purchase',
    }));
    for (const item of po1Items) {
      await purchItemRepo.save(purchItemRepo.create({ ...item, purchaseId: po1.id }));
      await upsertStock(item.partId, item.locationId, shopA.id, item.quantity);
      await addMovement({ partId: item.partId, shopId: shopA.id, type: StockMovementType.IN, toLocationId: item.locationId, quantity: item.quantity, referenceId: po1.id, createdById: adminA.id, notes: `Received: ${po1.invoiceNo}` });
    }
    console.log('  ✓ Purchase PO-1 (Ali Traders, RECEIVED)');
  }

  // PO-2: Pakistan Auto Parts — RECEIVED
  const po2Exists = await purchRepo.findOne({ where: { invoiceNo: 'PUR-SEED-0002', shopId: shopA.id } });
  if (!po2Exists) {
    const po2Items = [
      { partId: pA4.id, locationId: locA_ShA.id, quantity: 20, unitPrice: 800,  total: 16000 },
      { partId: pA5.id, locationId: locA_ShA.id, quantity: 10, unitPrice: 2500, total: 25000 },
      { partId: pA8.id, locationId: locA_ShB.id, quantity: 15, unitPrice: 450,  total: 6750  },
      { partId: pA9.id, locationId: locA_ShB.id, quantity: 40, unitPrice: 250,  total: 10000 },
    ];
    const po2Total = po2Items.reduce((s, i) => s + i.total, 0);
    const po2Paid  = 30000; // partial payment — tests payable ledger
    const po2 = await purchRepo.save(purchRepo.create({
      supplierId: supA2.id, invoiceNo: 'PUR-SEED-0002',
      date: days(15), total: po2Total, discount: 500, tax: 0,
      netTotal: po2Total - 500, paidAmount: po2Paid, paymentMethod: PaymentMethod.CASH,
      status: PurchaseStatus.RECEIVED, shopId: shopA.id, branchId: branchA1.id,
      createdById: adminA.id,
    }));
    for (const item of po2Items) {
      await purchItemRepo.save(purchItemRepo.create({ ...item, purchaseId: po2.id }));
      await upsertStock(item.partId, item.locationId, shopA.id, item.quantity);
      await addMovement({ partId: item.partId, shopId: shopA.id, type: StockMovementType.IN, toLocationId: item.locationId, quantity: item.quantity, referenceId: po2.id, createdById: adminA.id, notes: `Received: ${po2.invoiceNo}` });
    }
    const unpaid = (po2Total - 500) - po2Paid;
    await supplierRepo.update(supA2.id, { balance: unpaid });
    await ledgerRepo.save(ledgerRepo.create({ entityType: LedgerEntityType.SUPPLIER, entityId: supA2.id, type: LedgerEntryType.DEBIT, amount: unpaid, referenceType: 'purchase', referenceId: po2.id, balanceAfter: unpaid, shopId: shopA.id, notes: null }));
    console.log('  ✓ Purchase PO-2 (Pak Auto Parts, RECEIVED, partial payment)');
  }

  // PO-3: Honda Genuine — PENDING (not received yet)
  const po3Exists = await purchRepo.findOne({ where: { invoiceNo: 'PUR-SEED-0003', shopId: shopA.id } });
  if (!po3Exists) {
    const po3Items = [
      { partId: pA6.id, locationId: locA_Ctr.id, quantity: 5,  unitPrice: 5500, total: 27500 },
      { partId: pA10.id,locationId: locA_ShA.id, quantity: 8,  unitPrice: 1200, total: 9600  },
    ];
    const po3Total = po3Items.reduce((s, i) => s + i.total, 0);
    const po3 = await purchRepo.save(purchRepo.create({
      supplierId: supA3.id, invoiceNo: 'PUR-SEED-0003',
      date: days(3), total: po3Total, discount: 0, tax: 0,
      netTotal: po3Total, paidAmount: 0, paymentMethod: PaymentMethod.CREDIT,
      status: PurchaseStatus.PENDING, shopId: shopA.id, branchId: branchA1.id,
      createdById: adminA.id, notes: 'Awaiting delivery',
    }));
    for (const item of po3Items) {
      await purchItemRepo.save(purchItemRepo.create({ ...item, purchaseId: po3.id }));
    }
    console.log('  ✓ Purchase PO-3 (Honda Genuine, PENDING)');
  }

  // PO-4: Township branch restocking — RECEIVED
  const po4Exists = await purchRepo.findOne({ where: { invoiceNo: 'PUR-SEED-0004', shopId: shopA.id } });
  if (!po4Exists) {
    const po4Items = [
      { partId: pA1.id, locationId: locA_TP.id, quantity: 25, unitPrice: 150, total: 3750 },
      { partId: pA7.id, locationId: locA_TP.id, quantity: 30, unitPrice: 350, total: 10500 },
    ];
    const po4Total = po4Items.reduce((s, i) => s + i.total, 0);
    const po4 = await purchRepo.save(purchRepo.create({
      supplierId: supA1.id, invoiceNo: 'PUR-SEED-0004',
      date: days(10), total: po4Total, discount: 0, tax: 0,
      netTotal: po4Total, paidAmount: po4Total, paymentMethod: PaymentMethod.CASH,
      status: PurchaseStatus.RECEIVED, shopId: shopA.id, branchId: branchA2.id,
      createdById: adminA.id,
    }));
    for (const item of po4Items) {
      await purchItemRepo.save(purchItemRepo.create({ ...item, purchaseId: po4.id }));
      await upsertStock(item.partId, item.locationId, shopA.id, item.quantity);
      await addMovement({ partId: item.partId, shopId: shopA.id, type: StockMovementType.IN, toLocationId: item.locationId, quantity: item.quantity, referenceId: po4.id, createdById: adminA.id });
    }
    console.log('  ✓ Purchase PO-4 (Township Branch restocking, RECEIVED)');
  }

  // PO-5: Shop B
  const po5Exists = await purchRepo.findOne({ where: { invoiceNo: 'PUR-SEED-0005', shopId: shopB.id } });
  if (!po5Exists) {
    const po5Items = [
      { partId: pB1.id, locationId: locB_ShK.id, quantity: 40, unitPrice: 160, total: 6400 },
      { partId: pB2.id, locationId: locB_ShK.id, quantity: 10, unitPrice: 1800, total: 18000 },
      { partId: pB3.id, locationId: locB_WH.id,  quantity: 20, unitPrice: 600,  total: 12000 },
    ];
    const po5Total = po5Items.reduce((s, i) => s + i.total, 0);
    const po5 = await purchRepo.save(purchRepo.create({
      supplierId: supB1.id, invoiceNo: 'PUR-SEED-0005',
      date: days(12), total: po5Total, discount: 0, tax: 0,
      netTotal: po5Total, paidAmount: po5Total, paymentMethod: PaymentMethod.CASH,
      status: PurchaseStatus.RECEIVED, shopId: shopB.id, branchId: branchB1.id,
      createdById: adminB.id,
    }));
    for (const item of po5Items) {
      await purchItemRepo.save(purchItemRepo.create({ ...item, purchaseId: po5.id }));
      await upsertStock(item.partId, item.locationId, shopB.id, item.quantity);
      await addMovement({ partId: item.partId, shopId: shopB.id, type: StockMovementType.IN, toLocationId: item.locationId, quantity: item.quantity, referenceId: po5.id, createdById: adminB.id });
    }
    console.log('  ✓ Purchase PO-5 (Shop B, Karachi Motor Parts, RECEIVED)');
  }

  // ── 12. SALES (Shop A) ────────────────────────────────────────────────────

  const makeSale = async (data: {
    invoiceNo: string; shopId: string; branchId: string; createdById: string;
    customerId?: string | null; paymentMethod: PaymentMethod;
    items: Array<{ partId: string; locationId: string; quantity: number; unitPrice: number; discountPct?: number }>;
    discount?: number; paidAmount?: number; daysAgo: number;
  }) => {
    const exists = await saleRepo.findOne({ where: { invoiceNo: data.invoiceNo } });
    if (exists) return null;

    let subtotal = 0;
    const saleItems: SaleItem[] = [];
    for (const item of data.items) {
      const discPct = item.discountPct ?? 0;
      const lineTotal = item.quantity * item.unitPrice * (1 - discPct / 100);
      subtotal += lineTotal;
      saleItems.push(saleItemRepo.create({ partId: item.partId, quantity: item.quantity, unitPrice: item.unitPrice, discountPct: discPct, total: lineTotal }));
    }

    const discount  = data.discount ?? 0;
    const netTotal  = subtotal - discount;
    const paidAmount = data.paidAmount ?? netTotal;
    const changeAmount = Math.max(0, paidAmount - netTotal);

    const sale = await saleRepo.save(saleRepo.create({
      invoiceNo: data.invoiceNo, shopId: data.shopId, branchId: data.branchId,
      customerId: data.customerId ?? null, createdById: data.createdById,
      date: days(data.daysAgo), total: subtotal, discount, tax: 0,
      netTotal, paidAmount, changeAmount,
      paymentMethod: data.paymentMethod,
      status: SaleStatus.COMPLETED,
    }));

    // Backdate createdAt so reports trend chart shows historical spread
    await ds.query(`UPDATE sales SET "createdAt" = $1 WHERE id = $2`, [days(data.daysAgo), sale.id]);

    for (let i = 0; i < data.items.length; i++) {
      await saleItemRepo.save({ ...saleItems[i], saleId: sale.id });
      // deduct stock
      const stock = await stockRepo.findOne({ where: { partId: data.items[i].partId, locationId: data.items[i].locationId } });
      if (stock) {
        stock.quantity = Math.max(0, stock.quantity - data.items[i].quantity);
        await stockRepo.save(stock);
      }
      await addMovement({ partId: data.items[i].partId, shopId: data.shopId, type: StockMovementType.OUT, fromLocationId: data.items[i].locationId, quantity: data.items[i].quantity, referenceId: sale.id, createdById: data.createdById });
    }

    // ledger for credit customer
    const unpaid = netTotal - paidAmount;
    if (unpaid > 0 && data.customerId) {
      const cus = await customerRepo.findOne({ where: { id: data.customerId } });
      if (cus) {
        const newBal = parseFloat(String(cus.balance)) + unpaid;
        await customerRepo.update(cus.id, { balance: newBal });
        await ledgerRepo.save(ledgerRepo.create({ entityType: LedgerEntityType.CUSTOMER, entityId: cus.id, type: LedgerEntryType.DEBIT, amount: unpaid, referenceType: 'sale', referenceId: sale.id, balanceAfter: newBal, shopId: data.shopId, notes: null }));
      }
    }

    return sale;
  };

  await makeSale({ invoiceNo: 'INV-SEED-0001', shopId: shopA.id, branchId: branchA1.id, createdById: cashierA.id, customerId: cusA1.id, paymentMethod: PaymentMethod.CASH, daysAgo: 14,
    items: [
      { partId: pA1.id, locationId: locA_ShA.id, quantity: 3, unitPrice: 280 },
      { partId: pA3.id, locationId: locA_ShB.id, quantity: 8, unitPrice: 160 },
      { partId: pA7.id, locationId: locA_ShB.id, quantity: 5, unitPrice: 650 },
    ],
  });
  await makeSale({ invoiceNo: 'INV-SEED-0002', shopId: shopA.id, branchId: branchA1.id, createdById: cashierA.id, customerId: null, paymentMethod: PaymentMethod.CASH, daysAgo: 13,
    items: [
      { partId: pA4.id, locationId: locA_ShA.id, quantity: 2, unitPrice: 1500 },
      { partId: pA2.id, locationId: locA_ShA.id, quantity: 4, unitPrice: 380  },
    ],
  });
  await makeSale({ invoiceNo: 'INV-SEED-0003', shopId: shopA.id, branchId: branchA1.id, createdById: cashierA.id, customerId: cusA2.id, paymentMethod: PaymentMethod.CREDIT, daysAgo: 10,
    items: [
      { partId: pA5.id, locationId: locA_ShA.id, quantity: 3, unitPrice: 4500 },
      { partId: pA8.id, locationId: locA_ShB.id, quantity: 5, unitPrice: 850 },
    ],
    paidAmount: 5000, // partial — tests receivable
  });
  await makeSale({ invoiceNo: 'INV-SEED-0004', shopId: shopA.id, branchId: branchA1.id, createdById: cashierA.id, customerId: cusA3.id, paymentMethod: PaymentMethod.MOBILE_WALLET, daysAgo: 7,
    items: [
      { partId: pA9.id, locationId: locA_ShB.id, quantity: 10, unitPrice: 480 },
      { partId: pA7.id, locationId: locA_ShB.id, quantity: 10, unitPrice: 650 },
    ],
    discount: 500,
  });
  await makeSale({ invoiceNo: 'INV-SEED-0005', shopId: shopA.id, branchId: branchA1.id, createdById: cashierA.id, customerId: null, paymentMethod: PaymentMethod.CASH, daysAgo: 5,
    items: [
      { partId: pA1.id, locationId: locA_ShA.id, quantity: 5, unitPrice: 280 },
      { partId: pA3.id, locationId: locA_ShB.id, quantity: 12, unitPrice: 160 },
    ],
  });
  await makeSale({ invoiceNo: 'INV-SEED-0006', shopId: shopA.id, branchId: branchA2.id, createdById: cashierA.id, customerId: null, paymentMethod: PaymentMethod.CASH, daysAgo: 4,
    items: [
      { partId: pA1.id, locationId: locA_TP.id, quantity: 6, unitPrice: 280 },
      { partId: pA7.id, locationId: locA_TP.id, quantity: 8, unitPrice: 650 },
    ],
  });
  await makeSale({ invoiceNo: 'INV-SEED-0007', shopId: shopA.id, branchId: branchA1.id, createdById: cashierA.id, customerId: cusA1.id, paymentMethod: PaymentMethod.CASH, daysAgo: 2,
    items: [
      { partId: pA6.id, locationId: locA_Ctr.id, quantity: 0, unitPrice: 8500 }, // 0 qty — no stock yet (pending PO)
      { partId: pA2.id, locationId: locA_ShA.id, quantity: 3, unitPrice: 380 },
    ],
  });
  await makeSale({ invoiceNo: 'INV-SEED-0008', shopId: shopA.id, branchId: branchA1.id, createdById: cashierA.id, customerId: null, paymentMethod: PaymentMethod.CASH, daysAgo: 1,
    items: [
      { partId: pA4.id, locationId: locA_ShA.id, quantity: 1, unitPrice: 1500 },
      { partId: pA9.id, locationId: locA_ShB.id, quantity: 6, unitPrice: 480 },
    ],
  });
  await makeSale({ invoiceNo: 'INV-SEED-0009', shopId: shopA.id, branchId: branchA1.id, createdById: cashierA.id, customerId: cusA2.id, paymentMethod: PaymentMethod.CASH, daysAgo: 0,
    items: [
      { partId: pA3.id, locationId: locA_ShB.id, quantity: 20, unitPrice: 160 },
      { partId: pA7.id, locationId: locA_ShB.id, quantity: 15, unitPrice: 650 },
    ],
  });
  // Extra daily sales to populate the 30-day trend chart (Shop A)
  const trendSales: Array<{ inv: string; daysAgo: number; items: Array<{ partId: string; locationId: string; quantity: number; unitPrice: number }> }> = [
    { inv: 'INV-TREND-001', daysAgo: 29, items: [{ partId: pA1.id, locationId: locA_ShA.id, quantity: 4, unitPrice: 280 }, { partId: pA7.id, locationId: locA_ShB.id, quantity: 6, unitPrice: 650 }] },
    { inv: 'INV-TREND-002', daysAgo: 28, items: [{ partId: pA3.id, locationId: locA_ShB.id, quantity: 10, unitPrice: 160 }, { partId: pA2.id, locationId: locA_ShA.id, quantity: 3, unitPrice: 380 }] },
    { inv: 'INV-TREND-003', daysAgo: 27, items: [{ partId: pA4.id, locationId: locA_ShA.id, quantity: 2, unitPrice: 1500 }] },
    { inv: 'INV-TREND-004', daysAgo: 26, items: [{ partId: pA7.id, locationId: locA_ShB.id, quantity: 8, unitPrice: 650 }, { partId: pA9.id, locationId: locA_ShB.id, quantity: 5, unitPrice: 480 }] },
    { inv: 'INV-TREND-005', daysAgo: 25, items: [{ partId: pA1.id, locationId: locA_ShA.id, quantity: 6, unitPrice: 280 }, { partId: pA3.id, locationId: locA_ShB.id, quantity: 15, unitPrice: 160 }] },
    { inv: 'INV-TREND-006', daysAgo: 24, items: [{ partId: pA8.id, locationId: locA_ShB.id, quantity: 3, unitPrice: 850 }, { partId: pA2.id, locationId: locA_ShA.id, quantity: 2, unitPrice: 380 }] },
    { inv: 'INV-TREND-007', daysAgo: 23, items: [{ partId: pA5.id, locationId: locA_ShA.id, quantity: 1, unitPrice: 4500 }, { partId: pA7.id, locationId: locA_ShB.id, quantity: 10, unitPrice: 650 }] },
    { inv: 'INV-TREND-008', daysAgo: 22, items: [{ partId: pA3.id, locationId: locA_ShB.id, quantity: 12, unitPrice: 160 }, { partId: pA1.id, locationId: locA_ShA.id, quantity: 5, unitPrice: 280 }] },
    { inv: 'INV-TREND-009', daysAgo: 21, items: [{ partId: pA4.id, locationId: locA_ShA.id, quantity: 3, unitPrice: 1500 }, { partId: pA9.id, locationId: locA_ShB.id, quantity: 8, unitPrice: 480 }] },
    { inv: 'INV-TREND-010', daysAgo: 19, items: [{ partId: pA7.id, locationId: locA_ShB.id, quantity: 12, unitPrice: 650 }, { partId: pA2.id, locationId: locA_ShA.id, quantity: 4, unitPrice: 380 }] },
    { inv: 'INV-TREND-011', daysAgo: 18, items: [{ partId: pA1.id, locationId: locA_ShA.id, quantity: 7, unitPrice: 280 }, { partId: pA3.id, locationId: locA_ShB.id, quantity: 6, unitPrice: 160 }] },
    { inv: 'INV-TREND-012', daysAgo: 17, items: [{ partId: pA8.id, locationId: locA_ShB.id, quantity: 4, unitPrice: 850 }] },
    { inv: 'INV-TREND-013', daysAgo: 16, items: [{ partId: pA9.id, locationId: locA_ShB.id, quantity: 10, unitPrice: 480 }, { partId: pA7.id, locationId: locA_ShB.id, quantity: 5, unitPrice: 650 }] },
    { inv: 'INV-TREND-014', daysAgo: 12, items: [{ partId: pA3.id, locationId: locA_ShB.id, quantity: 18, unitPrice: 160 }, { partId: pA1.id, locationId: locA_ShA.id, quantity: 4, unitPrice: 280 }] },
    { inv: 'INV-TREND-015', daysAgo: 11, items: [{ partId: pA4.id, locationId: locA_ShA.id, quantity: 2, unitPrice: 1500 }, { partId: pA2.id, locationId: locA_ShA.id, quantity: 5, unitPrice: 380 }] },
    { inv: 'INV-TREND-016', daysAgo: 9,  items: [{ partId: pA7.id, locationId: locA_ShB.id, quantity: 9, unitPrice: 650 }, { partId: pA9.id, locationId: locA_ShB.id, quantity: 6, unitPrice: 480 }] },
    { inv: 'INV-TREND-017', daysAgo: 8,  items: [{ partId: pA1.id, locationId: locA_ShA.id, quantity: 8, unitPrice: 280 }, { partId: pA3.id, locationId: locA_ShB.id, quantity: 10, unitPrice: 160 }] },
    { inv: 'INV-TREND-018', daysAgo: 6,  items: [{ partId: pA5.id, locationId: locA_ShA.id, quantity: 2, unitPrice: 4500 }] },
    { inv: 'INV-TREND-019', daysAgo: 3,  items: [{ partId: pA4.id, locationId: locA_ShA.id, quantity: 2, unitPrice: 1500 }, { partId: pA7.id, locationId: locA_ShB.id, quantity: 7, unitPrice: 650 }] },
  ];
  for (const t of trendSales) {
    await makeSale({ invoiceNo: t.inv, shopId: shopA.id, branchId: branchA1.id, createdById: cashierA.id, paymentMethod: PaymentMethod.CASH, daysAgo: t.daysAgo, items: t.items });
  }
  console.log('  ✓ Sales (9 core + 19 trend invoices for Shop A)');

  // Shop B — 2 sales
  await makeSale({ invoiceNo: 'INV-SEED-0010', shopId: shopB.id, branchId: branchB1.id, createdById: cashierB.id, customerId: cusB1.id, paymentMethod: PaymentMethod.CASH, daysAgo: 5,
    items: [
      { partId: pB1.id, locationId: locB_ShK.id, quantity: 8, unitPrice: 300 },
      { partId: pB3.id, locationId: locB_WH.id,  quantity: 3, unitPrice: 1200 },
    ],
  });
  await makeSale({ invoiceNo: 'INV-SEED-0011', shopId: shopB.id, branchId: branchB1.id, createdById: cashierB.id, customerId: null, paymentMethod: PaymentMethod.CASH, daysAgo: 2,
    items: [
      { partId: pB2.id, locationId: locB_ShK.id, quantity: 2, unitPrice: 3500 },
    ],
  });
  console.log('  ✓ Sales (2 invoices for Shop B)');

  // ── 13. STOCK TRANSFER (Shop A) ───────────────────────────────────────────
  const xferExists = await movRepo.findOne({ where: { notes: 'Transfer restock: Main → Township', shopId: shopA.id } });
  if (!xferExists) {
    const xferStock = await stockRepo.findOne({ where: { partId: pA3.id, locationId: locA_ShB.id } });
    if (xferStock && xferStock.quantity >= 10) {
      xferStock.quantity -= 10;
      await stockRepo.save(xferStock);
      await upsertStock(pA3.id, locA_TP.id, shopA.id, 10);
      await addMovement({ partId: pA3.id, shopId: shopA.id, type: StockMovementType.TRANSFER, fromLocationId: locA_ShB.id, toLocationId: locA_TP.id, quantity: 10, createdById: managerA.id, notes: 'Transfer restock: Main → Township' });
      console.log('  ✓ Stock Transfer (Shelf B → Township, 10x Spark Plug)');
    }
  }

  // ── 14. EXPENSES ──────────────────────────────────────────────────────────
  const ensureExpense = async (data: { category: string; amount: number; shopId: string; branchId: string; createdById: string; date: Date; description?: string }) => {
    const exists = await expRepo.findOne({ where: { category: data.category, shopId: data.shopId, amount: data.amount } });
    if (exists) return;
    await expRepo.save(expRepo.create(data));
  };

  // Shop A expenses
  await ensureExpense({ category: 'Rent',         amount: 45000, shopId: shopA.id, branchId: branchA1.id, createdById: adminA.id, date: days(20), description: 'Monthly rent - Hall Road' });
  await ensureExpense({ category: 'Rent',         amount: 25000, shopId: shopA.id, branchId: branchA2.id, createdById: adminA.id, date: days(20), description: 'Monthly rent - Township' });
  await ensureExpense({ category: 'Electricity',  amount: 8500,  shopId: shopA.id, branchId: branchA1.id, createdById: adminA.id, date: days(18), description: 'LESCO bill - Main Branch' });
  await ensureExpense({ category: 'Electricity',  amount: 4200,  shopId: shopA.id, branchId: branchA2.id, createdById: adminA.id, date: days(18), description: 'LESCO bill - Township' });
  await ensureExpense({ category: 'Salaries',     amount: 35000, shopId: shopA.id, branchId: branchA1.id, createdById: adminA.id, date: days(15), description: 'Staff salaries - Main' });
  await ensureExpense({ category: 'Salaries',     amount: 22000, shopId: shopA.id, branchId: branchA2.id, createdById: adminA.id, date: days(15), description: 'Staff salaries - Township' });
  await ensureExpense({ category: 'Maintenance',  amount: 3500,  shopId: shopA.id, branchId: branchA1.id, createdById: adminA.id, date: days(10), description: 'AC repair' });
  await ensureExpense({ category: 'Fuel',         amount: 2000,  shopId: shopA.id, branchId: branchA1.id, createdById: cashierA.id, date: days(5), description: 'Delivery vehicle fuel' });
  await ensureExpense({ category: 'Miscellaneous',amount: 1500,  shopId: shopA.id, branchId: branchA1.id, createdById: cashierA.id, date: days(2), description: 'Stationery and packaging' });

  // Shop B expenses
  await ensureExpense({ category: 'Rent',        amount: 55000, shopId: shopB.id, branchId: branchB1.id, createdById: adminB.id, date: days(20), description: 'Monthly rent - Tariq Road' });
  await ensureExpense({ category: 'Electricity', amount: 9200,  shopId: shopB.id, branchId: branchB1.id, createdById: adminB.id, date: days(18), description: 'KESC bill' });
  await ensureExpense({ category: 'Salaries',    amount: 30000, shopId: shopB.id, branchId: branchB1.id, createdById: adminB.id, date: days(15), description: 'Staff salaries' });
  console.log('  ✓ Expenses seeded');

  console.log('\n  ════════════════════════════════════════');
  console.log('  Seed complete. Login credentials:');
  console.log('  ────────────────────────────────────────');
  console.log('  SUPER_ADMIN  admin@autoparts.pk       Admin@123');
  console.log('  ──── Shop A: Al-Rahim Auto Parts ────');
  console.log('  ADMIN        admin@alrahim.pk         Admin@123');
  console.log('  MANAGER      manager@alrahim.pk       Manager@123');
  console.log('  CASHIER      cashier@alrahim.pk       Cashier@123');
  console.log('  ──── Shop B: Bashir Spare Parts ─────');
  console.log('  ADMIN        admin@bashir.pk          Admin@123');
  console.log('  CASHIER      cashier@bashir.pk        Cashier@123');
  console.log('  ════════════════════════════════════════\n');
}
