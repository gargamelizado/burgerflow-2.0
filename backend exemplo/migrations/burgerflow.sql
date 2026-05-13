-- BurgerFlow ERP - migration PostgreSQL de referencia.
-- O runtime atual do projeto usa Express + MySQL com bootstrap em backend/src/bootstrap/ensureSchema.js.
-- Este arquivo documenta o contrato relacional preparado para uma futura camada NestJS/TypeORM + PostgreSQL.

CREATE TABLE IF NOT EXISTS stores (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  business_type VARCHAR(40) NOT NULL CHECK (business_type IN ('fast_food', 'retail', 'pharmacy')),
  document VARCHAR(40),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT REFERENCES stores(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(120),
  barcode VARCHAR(80),
  brand VARCHAR(120),
  unit VARCHAR(20) NOT NULL DEFAULT 'un',
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  min_stock NUMERIC(12,3) NOT NULL DEFAULT 0,
  expiration_date DATE,
  preparation_station VARCHAR(80),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drug_details (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL UNIQUE REFERENCES products(id),
  active_ingredient VARCHAR(180),
  anvisa_registration VARCHAR(80),
  laboratory VARCHAR(160),
  medicine_type VARCHAR(60) NOT NULL DEFAULT 'common',
  stripe VARCHAR(40) NOT NULL DEFAULT 'none',
  requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
  controlled BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT REFERENCES stores(id),
  name VARCHAR(180) NOT NULL,
  document VARCHAR(40),
  phone VARCHAR(40),
  email VARCHAR(160),
  address TEXT,
  laboratory BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stock_batches (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  supplier_id BIGINT REFERENCES suppliers(id),
  batch_code VARCHAR(80) NOT NULL,
  expires_at DATE NOT NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cash_registers (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT REFERENCES stores(id),
  operator_id BIGINT,
  manager_closed_by BIGINT,
  status VARCHAR(40) NOT NULL DEFAULT 'open',
  opening_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_cash_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  counted_cash_amount NUMERIC(12,2),
  difference NUMERIC(12,2),
  difference_reason TEXT,
  notes TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT REFERENCES stores(id),
  customer_id BIGINT,
  cash_register_id BIGINT REFERENCES cash_registers(id),
  operator_id BIGINT,
  order_number BIGINT NOT NULL,
  order_channel VARCHAR(40) NOT NULL,
  status VARCHAR(60) NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  priority INT NOT NULL DEFAULT 0,
  estimated_ready_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  sent_to_kitchen_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  product_id BIGINT REFERENCES products(id),
  product_name VARCHAR(255),
  quantity NUMERIC(12,3) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  batch_id BIGINT REFERENCES stock_batches(id),
  preparation_status VARCHAR(40) NOT NULL DEFAULT 'received'
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  cash_register_id BIGINT REFERENCES cash_registers(id),
  method VARCHAR(40) NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  received_amount NUMERIC(12,2),
  change_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(40) NOT NULL DEFAULT 'approved',
  qr_code VARCHAR(180),
  pix_code TEXT,
  provider VARCHAR(60),
  external_reference VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS card_terminals (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT REFERENCES stores(id),
  name VARCHAR(120) NOT NULL,
  provider VARCHAR(60) NOT NULL,
  terminal_id VARCHAR(120),
  serial_number VARCHAR(120),
  status VARCHAR(40) NOT NULL DEFAULT 'active',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS card_transactions (
  id BIGSERIAL PRIMARY KEY,
  payment_id BIGINT REFERENCES payments(id),
  order_id BIGINT REFERENCES orders(id),
  store_id BIGINT REFERENCES stores(id),
  cash_register_id BIGINT REFERENCES cash_registers(id),
  operator_id BIGINT,
  card_terminal_id BIGINT REFERENCES card_terminals(id),
  provider VARCHAR(60) NOT NULL,
  transaction_id VARCHAR(120),
  authorization_code VARCHAR(80),
  nsu VARCHAR(80),
  brand VARCHAR(60),
  installments INT NOT NULL DEFAULT 1,
  amount NUMERIC(12,2) NOT NULL,
  method VARCHAR(40) NOT NULL,
  card_last4 VARCHAR(8),
  acquirer_response_code VARCHAR(40),
  acquirer_message TEXT,
  receipt_customer TEXT,
  receipt_merchant TEXT,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  raw_request JSONB,
  raw_response JSONB,
  requested_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT,
  patient_name VARCHAR(180) NOT NULL,
  patient_document VARCHAR(40),
  doctor_name VARCHAR(180) NOT NULL,
  doctor_crm VARCHAR(60) NOT NULL,
  prescription_date DATE NOT NULL,
  prescription_type VARCHAR(80) NOT NULL,
  file_url TEXT,
  order_id BIGINT REFERENCES orders(id),
  operator_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS delivery_orders (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  customer_name VARCHAR(180),
  customer_phone VARCHAR(40),
  delivery_address TEXT,
  address_reference TEXT,
  delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  courier_name VARCHAR(180),
  courier_phone VARCHAR(40),
  status VARCHAR(40) NOT NULL DEFAULT 'received',
  marketplace_name VARCHAR(80),
  marketplace_order_id VARCHAR(120),
  estimated_delivery_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS kitchen_order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  order_item_id BIGINT REFERENCES order_items(id),
  station VARCHAR(80) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'received',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  prepared_by BIGINT
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  old_status VARCHAR(60),
  new_status VARCHAR(60) NOT NULL,
  user_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS customer_display_queue (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id),
  order_number BIGINT NOT NULL,
  display_status VARCHAR(40) NOT NULL DEFAULT 'preparing',
  called_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  action VARCHAR(120) NOT NULL,
  entity VARCHAR(120),
  entity_id BIGINT,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
