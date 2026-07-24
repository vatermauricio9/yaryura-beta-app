/*
# Gestión de Alquileres - Schema Inicial (Beta)

## Resumen
Crea el esquema completo para el sistema de gestión de alquileres de Yaryura Propiedades.
Incluye perfiles de usuario (inquilinos y personal), inquilinos, contratos, meses de alquiler,
pagos en efectivo (USD/ARS), y documentos subidos por inquilinos.

## Tablas nuevas
1. `profiles` - Extiende auth.users con rol (tenant/staff), nombre completo y email.
2. `tenants` - Datos del inquilino: nombre, email, teléfono, dirección propiedad, sucursal.
3. `lease_contracts` - Contratos de alquiler: inquilino, dirección, fechas, moneda, monto mensual.
4. `rent_months` - Meses de alquiler generados a partir del contrato, con monto que puede variar (IPC).
5. `payments` - Pagos registrados por personal de inmobiliaria, en efectivo, USD o ARS.
6. `tenant_documents` - Documentos subidos por inquilinos (facturas de servicios, comprobantes de pago).

## Seguridad
- RLS habilitado en todas las tablas.
- Inquilinos solo ven/editan sus propios datos.
- Personal (staff) ve todos los datos.
- Las políticas usan auth.uid() y verifican rol desde profiles.
*/

-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'tenant' CHECK (role IN ('tenant', 'staff')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "staff_read_all_profiles" ON profiles;
CREATE POLICY "staff_read_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

-- ============================================
-- TENANTS
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  property_address text NOT NULL,
  branch text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_own" ON tenants;
CREATE POLICY "tenant_select_own" ON tenants FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "staff_select_all_tenants" ON tenants;
CREATE POLICY "staff_select_all_tenants" ON tenants FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

DROP POLICY IF EXISTS "staff_insert_tenants" ON tenants;
CREATE POLICY "staff_insert_tenants" ON tenants FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

DROP POLICY IF EXISTS "staff_update_tenants" ON tenants;
CREATE POLICY "staff_update_tenants" ON tenants
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

DROP POLICY IF EXISTS "staff_delete_tenants" ON tenants;
CREATE POLICY "staff_delete_tenants" ON tenants FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

-- ============================================
-- LEASE CONTRACTS
-- ============================================
CREATE TABLE IF NOT EXISTS lease_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  property_address text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'ARS')),
  monthly_amount numeric(12,2) NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lease_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_own_contracts" ON lease_contracts;
CREATE POLICY "tenant_select_own_contracts" ON lease_contracts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tenants t WHERE t.id = lease_contracts.tenant_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "staff_select_all_contracts" ON lease_contracts;
CREATE POLICY "staff_select_all_contracts" ON lease_contracts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

DROP POLICY IF EXISTS "staff_insert_contracts" ON lease_contracts;
CREATE POLICY "staff_insert_contracts" ON lease_contracts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

DROP POLICY IF EXISTS "staff_update_contracts" ON lease_contracts;
CREATE POLICY "staff_update_contracts" ON lease_contracts
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

DROP POLICY IF EXISTS "staff_delete_contracts" ON lease_contracts;
CREATE POLICY "staff_delete_contracts" ON lease_contracts FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

-- ============================================
-- RENT MONTHS
-- ============================================
CREATE TABLE IF NOT EXISTS rent_months (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES lease_contracts(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period text NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'ARS')),
  due_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (contract_id, period)
);

ALTER TABLE rent_months ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_own_rent_months" ON rent_months;
CREATE POLICY "tenant_select_own_rent_months" ON rent_months FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tenants t WHERE t.id = rent_months.tenant_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "staff_select_all_rent_months" ON rent_months;
CREATE POLICY "staff_select_all_rent_months" ON rent_months FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

DROP POLICY IF EXISTS "staff_insert_rent_months" ON rent_months;
CREATE POLICY "staff_insert_rent_months" ON rent_months FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

DROP POLICY IF EXISTS "staff_update_rent_months" ON rent_months;
CREATE POLICY "staff_update_rent_months" ON rent_months
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

DROP POLICY IF EXISTS "staff_delete_rent_months" ON rent_months;
CREATE POLICY "staff_delete_rent_months" ON rent_months FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rent_month_id uuid REFERENCES rent_months(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD' CHECK (currency IN ('USD', 'ARS')),
  method text NOT NULL DEFAULT 'cash',
  period text NOT NULL,
  registered_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  registered_at timestamptz DEFAULT now(),
  notes text
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_own_payments" ON payments;
CREATE POLICY "tenant_select_own_payments" ON payments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tenants t WHERE t.id = payments.tenant_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "staff_select_all_payments" ON payments;
CREATE POLICY "staff_select_all_payments" ON payments FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

DROP POLICY IF EXISTS "staff_insert_payments" ON payments;
CREATE POLICY "staff_insert_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

DROP POLICY IF EXISTS "staff_update_payments" ON payments;
CREATE POLICY "staff_update_payments" ON payments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

DROP POLICY IF EXISTS "staff_delete_payments" ON payments;
CREATE POLICY "staff_delete_payments" ON payments FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

-- ============================================
-- TENANT DOCUMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rent_month_id uuid REFERENCES rent_months(id) ON DELETE SET NULL,
  category text NOT NULL DEFAULT 'other' CHECK (category IN ('service_bill', 'payment_receipt', 'other')),
  file_name text NOT NULL,
  file_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  period text NOT NULL,
  uploaded_at timestamptz DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  rejection_reason text
);

ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_own_docs" ON tenant_documents;
CREATE POLICY "tenant_select_own_docs" ON tenant_documents FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_documents.tenant_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "tenant_insert_own_docs" ON tenant_documents;
CREATE POLICY "tenant_insert_own_docs" ON tenant_documents FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM tenants t WHERE t.id = tenant_documents.tenant_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "staff_select_all_docs" ON tenant_documents;
CREATE POLICY "staff_select_all_docs" ON tenant_documents FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

DROP POLICY IF EXISTS "staff_update_docs" ON tenant_documents;
CREATE POLICY "staff_update_docs" ON tenant_documents
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

DROP POLICY IF EXISTS "staff_delete_docs" ON tenant_documents;
CREATE POLICY "staff_delete_docs" ON tenant_documents FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'staff')
  );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_tenant_id ON lease_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_months_tenant_id ON rent_months(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rent_months_contract_period ON rent_months(contract_id, period);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_period ON payments(period);
CREATE INDEX IF NOT EXISTS idx_documents_tenant_id ON tenant_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON tenant_documents(status);

-- ============================================
-- TRIGGER: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'tenant')
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
