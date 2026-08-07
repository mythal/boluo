DROP TABLE character_assets;

DROP TABLE entry_component_history;
DROP TABLE entry_components;

CREATE TYPE entry_component_payload_type AS ENUM ('Json', 'Asset');

CREATE TABLE entry_components (
    entry_id uuid NOT NULL
        CONSTRAINT entry_component_entry
        REFERENCES entries (id)
        ON DELETE CASCADE,
    component_type text NOT NULL,
    payload_type entry_component_payload_type NOT NULL,
    version uuid NOT NULL DEFAULT uuidv7(),
    modified timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (entry_id, component_type),
    CONSTRAINT entry_component_payload_type_identity
        UNIQUE (entry_id, component_type, payload_type),
    CONSTRAINT entry_component_type_valid CHECK (
        length(component_type) <= 200
        AND component_type ~ '^[a-z0-9]+([._-][a-z0-9]+)*(/[a-z0-9]+([._-][a-z0-9]+)*)+$'
    )
);

CREATE TABLE entry_components_json (
    entry_id uuid NOT NULL,
    component_type text NOT NULL,
    payload_type entry_component_payload_type NOT NULL DEFAULT 'Json'
        CONSTRAINT entry_components_json_payload_type_valid
        CHECK (payload_type = 'Json'),
    data jsonb NOT NULL,
    schema_version integer NOT NULL DEFAULT 1
        CONSTRAINT entry_components_json_schema_version_valid
        CHECK (schema_version > 0),
    PRIMARY KEY (entry_id, component_type),
    CONSTRAINT entry_components_json_parent
        FOREIGN KEY (entry_id, component_type, payload_type)
        REFERENCES entry_components (entry_id, component_type, payload_type)
        ON DELETE CASCADE
);

CREATE TABLE entry_components_asset (
    entry_id uuid NOT NULL,
    component_type text NOT NULL,
    payload_type entry_component_payload_type NOT NULL DEFAULT 'Asset'
        CONSTRAINT entry_components_asset_payload_type_valid
        CHECK (payload_type = 'Asset'),
    scope_id uuid NOT NULL,
    space_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    PRIMARY KEY (entry_id, component_type),
    CONSTRAINT entry_components_asset_parent
        FOREIGN KEY (entry_id, component_type, payload_type)
        REFERENCES entry_components (entry_id, component_type, payload_type)
        ON DELETE CASCADE,
    CONSTRAINT entry_components_asset_entry
        FOREIGN KEY (scope_id, entry_id)
        REFERENCES entries (scope_id, id)
        ON DELETE CASCADE,
    CONSTRAINT entry_components_asset_scope
        FOREIGN KEY (space_id, scope_id)
        REFERENCES scopes (space_id, id)
        ON DELETE CASCADE,
    CONSTRAINT entry_components_asset_asset
        FOREIGN KEY (space_id, asset_id)
        REFERENCES assets (space_id, id)
        ON DELETE RESTRICT
);

CREATE INDEX entry_components_asset_asset_index
    ON entry_components_asset (space_id, asset_id);

CREATE INDEX entry_components_asset_scope_index
    ON entry_components_asset (space_id, scope_id, entry_id);

CREATE TABLE entry_component_history (
    entry_effect_id uuid NOT NULL
        CONSTRAINT entry_component_history_effect
        REFERENCES entry_effects (id)
        ON DELETE CASCADE,
    entry_id uuid NOT NULL,
    key text NOT NULL,
    component_type text NOT NULL,
    action entry_component_history_action NOT NULL,
    payload jsonb,
    PRIMARY KEY (entry_effect_id, entry_id, component_type),
    CONSTRAINT entry_component_history_type_valid CHECK (
        length(component_type) <= 200
        AND component_type ~ '^[a-z0-9]+([._-][a-z0-9]+)*(/[a-z0-9]+([._-][a-z0-9]+)*)+$'
    ),
    CONSTRAINT entry_component_history_state_valid CHECK (
        (
            action = 'Set'
            AND payload IS NOT NULL
        )
        OR
        (
            action = 'Remove'
            AND payload IS NULL
        )
    )
);

CREATE INDEX entry_component_history_entry_effect_index
    ON entry_component_history (
        entry_id,
        component_type,
        entry_effect_id
    );

CREATE INDEX entry_component_history_key_effect_index
    ON entry_component_history (
        key,
        entry_effect_id,
        entry_id,
        component_type
    );

ALTER TABLE entries
    ADD COLUMN pos_p integer,
    ADD COLUMN pos_q integer;

WITH ranked AS (
    SELECT
        id,
        row_number() OVER (PARTITION BY scope_id ORDER BY sort, id)::integer AS position
    FROM entries
)
UPDATE entries
SET pos_p = ranked.position,
    pos_q = 1
FROM ranked
WHERE entries.id = ranked.id;

DROP INDEX entry_scope_sort_index;

ALTER TABLE entries
    ALTER COLUMN pos_p SET NOT NULL,
    ALTER COLUMN pos_q SET NOT NULL,
    ADD COLUMN pos double precision
        GENERATED ALWAYS AS (pos_p::double precision / pos_q::double precision) STORED,
    ADD CONSTRAINT entry_position_valid CHECK (pos_p >= 0 AND pos_q > 0),
    ADD CONSTRAINT entry_scope_position_unique UNIQUE (scope_id, pos) DEFERRABLE,
    DROP COLUMN sort;

CREATE INDEX entry_scope_position_index
    ON entries (scope_id, pos, id);
