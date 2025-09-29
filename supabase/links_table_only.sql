-- Links table creation only
-- This creates just the links table and related objects

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create links table
CREATE TABLE IF NOT EXISTS links (
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
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_links_category ON links(category);
CREATE INDEX IF NOT EXISTS idx_links_is_active ON links(is_active);
CREATE INDEX IF NOT EXISTS idx_links_sort_order ON links(sort_order);
CREATE INDEX IF NOT EXISTS idx_links_created_by ON links(created_by);

-- Create function for updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_links_updated_at ON links;
CREATE TRIGGER update_links_updated_at 
    BEFORE UPDATE ON links 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO links (title, url, description, category, icon, color, sort_order, is_external) VALUES
('Tender Estimates', '/documents/tender-estimate', 'Management of tender estimates with materials and work', 'Documents', 'FileTextOutlined', '#1677ff', 1, false),
('Object Estimates', '/documents/object-estimate', 'Tracking actual data for construction objects', 'Documents', 'FileTextOutlined', '#52c41a', 2, false),
('Users', '/developer/users', 'System user management', 'Developer', 'TeamOutlined', '#722ed1', 3, false),
('Projects', '/references/projects', 'Project management and responsibility assignment', 'Developer', 'BarChartOutlined', '#cf1322', 4, false),
('Units', '/references/units', 'Units of measurement reference', 'Developer', 'BookOutlined', '#52c41a', 5, false),
('Material Types', '/references/material-types', 'Material types reference', 'Developer', 'BookOutlined', '#fa8c16', 6, false),
('GitHub', 'https://github.com/company/star-portal', 'Source code repository', 'Tools', 'GithubOutlined', '#000000', 7, true)
ON CONFLICT (id) DO NOTHING;

-- Add comments
COMMENT ON TABLE links IS 'Quick access links table';
COMMENT ON COLUMN links.title IS 'Link display name';
COMMENT ON COLUMN links.url IS 'Link URL address';
COMMENT ON COLUMN links.description IS 'Link description';
COMMENT ON COLUMN links.category IS 'Link category';
COMMENT ON COLUMN links.icon IS 'Ant Design icon name';
COMMENT ON COLUMN links.color IS 'Icon display color';
COMMENT ON COLUMN links.sort_order IS 'Link sorting order';
COMMENT ON COLUMN links.is_active IS 'Link active status';
COMMENT ON COLUMN links.is_external IS 'External link flag';
COMMENT ON COLUMN links.created_by IS 'User who created the link';