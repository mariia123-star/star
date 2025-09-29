-- Test SQL schema for links table
-- This is a simplified version to test syntax

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (for recreation)
DROP TABLE IF EXISTS links CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(20) NOT NULL DEFAULT 'engineer' CHECK (role IN ('administrator', 'engineer')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Links table
CREATE TABLE links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    category VARCHAR(100),
    icon VARCHAR(100),
    color VARCHAR(20),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_external BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for query optimization
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_links_category ON links(category);
CREATE INDEX idx_links_is_active ON links(is_active);
CREATE INDEX idx_links_sort_order ON links(sort_order);
CREATE INDEX idx_links_created_by ON links(created_by);

-- Function for automatic updated_at field updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Triggers for automatic updated_at updates
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_links_updated_at 
    BEFORE UPDATE ON links 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data
INSERT INTO users (full_name, email, role) VALUES
('Ivan Ivanov', 'ivanov@star-portal.ru', 'administrator'),
('Anna Petrova', 'petrova@star-portal.ru', 'engineer'),
('Alexey Sidorov', 'sidorov@star-portal.ru', 'engineer');

-- Sample links
INSERT INTO links (title, url, description, category, icon, color, sort_order, is_external, created_by) VALUES
('Tender Estimates', '/documents/tender-estimate', 'Management of tender estimates with materials and work', 'Documents', 'FileTextOutlined', '#1677ff', 1, false, (SELECT id FROM users WHERE role = 'administrator' LIMIT 1)),
('Object Estimates', '/documents/object-estimate', 'Tracking actual data for construction objects', 'Documents', 'FileTextOutlined', '#52c41a', 2, false, (SELECT id FROM users WHERE role = 'administrator' LIMIT 1)),
('Users', '/developer/users', 'System user management', 'Developer', 'TeamOutlined', '#722ed1', 3, false, (SELECT id FROM users WHERE role = 'administrator' LIMIT 1)),
('Projects', '/references/projects', 'Project management and responsibility assignment', 'Developer', 'BarChartOutlined', '#cf1322', 4, false, (SELECT id FROM users WHERE role = 'administrator' LIMIT 1)),
('GitHub Repository', 'https://github.com/company/star-portal', 'STAR Portal project source code', 'Tools', 'GithubOutlined', '#000000', 7, true, (SELECT id FROM users WHERE role = 'administrator' LIMIT 1));

-- Comments
COMMENT ON TABLE users IS 'Corporate portal users';
COMMENT ON TABLE links IS 'Quick access links table';
COMMENT ON COLUMN links.title IS 'Link display name';
COMMENT ON COLUMN links.url IS 'Link URL address (internal or external)';
COMMENT ON COLUMN links.description IS 'Link description';
COMMENT ON COLUMN links.category IS 'Link category (Documents, Developer, Tools, etc.)';
COMMENT ON COLUMN links.icon IS 'Ant Design icon name';
COMMENT ON COLUMN links.color IS 'Icon display color (hex code)';
COMMENT ON COLUMN links.sort_order IS 'Link sorting order';
COMMENT ON COLUMN links.is_active IS 'Link active status';
COMMENT ON COLUMN links.is_external IS 'External link (opens in new window)';
COMMENT ON COLUMN links.created_by IS 'UUID of user who created the link';