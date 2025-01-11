-- Users table (PostgreSQL)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    profile_image VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schedule table (PostgreSQL)
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE,  -- NULL for inbox items
    end_time TIMESTAMP WITH TIME ZONE,    -- NULL for inbox items
    location VARCHAR(512),
    meeting_link VARCHAR(512),
    is_inbox BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tags table (PostgreSQL)
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL, -- Hex color code
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schedule-Tags junction table (PostgreSQL)
CREATE TABLE schedule_tags (
    schedule_id UUID REFERENCES schedules(id),
    tag_id UUID REFERENCES tags(id),
    PRIMARY KEY (schedule_id, tag_id)
);

-- Notes table (PostgreSQL)
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content JSONB NOT NULL, -- Store rich text content as JSONB
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Schedule-Notes junction table (PostgreSQL)
CREATE TABLE schedule_notes (
    schedule_id UUID REFERENCES schedules(id),
    note_id UUID REFERENCES notes(id),
    PRIMARY KEY (schedule_id, note_id)
);

-- Note changes for collaborative editing (DynamoDB)
{
    "pk": "note#<note_id>",
    "sk": "<timestamp>#<user_id>",
    "changes": [], // Array of operations
    "version": number,
    "user_id": string,
    "timestamp": number
}

-- Schedule quick-access data (DynamoDB)
{
    "pk": "user#<user_id>",
    "sk": "schedule#<schedule_id>",
    "title": string,
    "start_time": number,
    "end_time": number,
    "order": number,
    "updated_at": number
}