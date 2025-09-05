-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cost categories table
CREATE TABLE IF NOT EXISTS cost_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Detail cost categories table
CREATE TABLE IF NOT EXISTS detail_cost_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cost_category_id UUID NOT NULL REFERENCES cost_categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Location table
CREATE TABLE IF NOT EXISTS location (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Units table
CREATE TABLE IF NOT EXISTS units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    short_name VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main chessboard table
CREATE TABLE IF NOT EXISTS chessboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material TEXT,
    quantity DECIMAL(15,4),
    unit VARCHAR(50),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    block_id UUID REFERENCES blocks(id) ON DELETE SET NULL,
    cost_category_id UUID REFERENCES cost_categories(id) ON DELETE SET NULL,
    cost_type_id UUID REFERENCES detail_cost_categories(id) ON DELETE SET NULL,
    location_id UUID REFERENCES location(id) ON DELETE SET NULL,
    row_color VARCHAR(20) DEFAULT NULL,
    document_section VARCHAR(255),
    document_code VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documentation table
CREATE TABLE IF NOT EXISTS documentation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    content TEXT,
    file_path VARCHAR(1000),
    file_size BIGINT,
    mime_type VARCHAR(100),
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rates table
CREATE TABLE IF NOT EXISTS rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    rate_value DECIMAL(15,4) NOT NULL,
    unit VARCHAR(50),
    cost_category_id UUID REFERENCES cost_categories(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chessboard mapping table (many-to-many relationships)
CREATE TABLE IF NOT EXISTS chessboard_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chessboard_id UUID NOT NULL REFERENCES chessboard(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    mapping_type VARCHAR(50) NOT NULL
);

-- Universal entity comments mapping table
CREATE TABLE IF NOT EXISTS entity_comments_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    comment_text TEXT NOT NULL,
    author_id UUID,
    comment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chessboard_project_id ON chessboard(project_id);
CREATE INDEX IF NOT EXISTS idx_chessboard_block_id ON chessboard(block_id);
CREATE INDEX IF NOT EXISTS idx_chessboard_cost_category_id ON chessboard(cost_category_id);
CREATE INDEX IF NOT EXISTS idx_chessboard_updated_at ON chessboard(updated_at);
CREATE INDEX IF NOT EXISTS idx_blocks_project_id ON blocks(project_id);
CREATE INDEX IF NOT EXISTS idx_detail_cost_categories_category_id ON detail_cost_categories(cost_category_id);
CREATE INDEX IF NOT EXISTS idx_chessboard_mapping_entity ON chessboard_mapping(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_comments_entity ON entity_comments_mapping(entity_type, entity_id);

-- Functions for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blocks_updated_at BEFORE UPDATE ON blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cost_categories_updated_at BEFORE UPDATE ON cost_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_detail_cost_categories_updated_at BEFORE UPDATE ON detail_cost_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_location_updated_at BEFORE UPDATE ON location FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chessboard_updated_at BEFORE UPDATE ON chessboard FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documentation_updated_at BEFORE UPDATE ON documentation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rates_updated_at BEFORE UPDATE ON rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();