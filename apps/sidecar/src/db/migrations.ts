import { db } from '@/db/database'

export function runMigrations(): void {
  db.exec('PRAGMA foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id               TEXT PRIMARY KEY NOT NULL,
      name             TEXT NOT NULL,
      system           TEXT NOT NULL,
      setting          TEXT,
      current_scene_id TEXT,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id               TEXT PRIMARY KEY NOT NULL,
      campaign_id      TEXT NOT NULL,
      display_name     TEXT NOT NULL,
      email            TEXT,
      is_host          INTEGER NOT NULL DEFAULT 0 CHECK (is_host IN (0,1)),
      preferences_json TEXT,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      UNIQUE (campaign_id, display_name)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS factions (
      id               TEXT PRIMARY KEY NOT NULL,
      campaign_id      TEXT NOT NULL,
      name             TEXT NOT NULL,
      type             TEXT,
      description      TEXT,
      reputation_score INTEGER NOT NULL DEFAULT 0,
      goals_json       TEXT,
      status           TEXT NOT NULL DEFAULT 'active',
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      UNIQUE (campaign_id, name)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS image_assets (
      id            TEXT PRIMARY KEY NOT NULL,
      campaign_id   TEXT,
      asset_type    TEXT NOT NULL,
      entity_type   TEXT,
      entity_id     TEXT,
      title         TEXT,
      file_path     TEXT NOT NULL,
      mime_type     TEXT,
      width         INTEGER,
      height        INTEGER,
      prompt_text   TEXT,
      source_type   TEXT NOT NULL DEFAULT 'generated',
      metadata_json TEXT,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id                 TEXT PRIMARY KEY NOT NULL,
      campaign_id        TEXT NOT NULL,
      parent_location_id TEXT,
      name               TEXT NOT NULL,
      type               TEXT NOT NULL,
      description_public TEXT,
      description_gm     TEXT,
      tags_json          TEXT,
      danger_level       INTEGER NOT NULL DEFAULT 0,
      image_asset_id     TEXT,
      created_at         TEXT NOT NULL,
      updated_at         TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_location_id) REFERENCES locations(id) ON DELETE SET NULL,
      FOREIGN KEY (image_asset_id) REFERENCES image_assets(id) ON DELETE SET NULL,
      UNIQUE (campaign_id, name)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS audio_cues (
      id             TEXT PRIMARY KEY NOT NULL,
      campaign_id    TEXT,
      name           TEXT NOT NULL,
      cue_type       TEXT NOT NULL,
      category       TEXT,
      file_path      TEXT NOT NULL,
      loop           INTEGER NOT NULL DEFAULT 0 CHECK (loop IN (0,1)),
      default_volume REAL NOT NULL DEFAULT 1.0,
      fade_in_ms     INTEGER NOT NULL DEFAULT 0,
      fade_out_ms    INTEGER NOT NULL DEFAULT 0,
      tags_json      TEXT,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS voice_profiles (
      id          TEXT PRIMARY KEY NOT NULL,
      campaign_id TEXT,
      name        TEXT NOT NULL,
      provider    TEXT NOT NULL,
      voice_key   TEXT NOT NULL,
      language    TEXT NOT NULL DEFAULT 'fr-FR',
      gender_hint TEXT,
      style_hint  TEXT,
      speed       REAL NOT NULL DEFAULT 1.0,
      pitch       REAL NOT NULL DEFAULT 1.0,
      sample_path TEXT,
      is_default  INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0,1)),
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id          TEXT PRIMARY KEY NOT NULL,
      campaign_id TEXT NOT NULL,
      name        TEXT NOT NULL,
      role        TEXT NOT NULL,
      -- All system-specific stats (HP, level, sanity, stress, skills…) live in stats_json.
      -- This keeps the table schema system-agnostic (D&D 5e, CoC, Fate, etc.).
      stats_json  TEXT NOT NULL,
      status_json TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS npcs (
      id               TEXT PRIMARY KEY NOT NULL,
      campaign_id      TEXT NOT NULL,
      name             TEXT NOT NULL,
      faction_id       TEXT,
      location_id      TEXT,
      voice_profile_id TEXT,
      summary          TEXT,
      disposition      TEXT,
      secret_notes     TEXT,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (faction_id) REFERENCES factions(id) ON DELETE SET NULL,
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
      FOREIGN KEY (voice_profile_id) REFERENCES voice_profiles(id) ON DELETE SET NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS scenes (
      id                    TEXT PRIMARY KEY NOT NULL,
      campaign_id           TEXT NOT NULL,
      location_id           TEXT,
      name                  TEXT NOT NULL,
      scene_type            TEXT NOT NULL,
      status                TEXT NOT NULL,
      intensity             TEXT,
      entry_conditions_json TEXT,
      exit_conditions_json  TEXT,
      audio_cue_id          TEXT,
      created_at            TEXT NOT NULL,
      updated_at            TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
      FOREIGN KEY (audio_cue_id) REFERENCES audio_cues(id) ON DELETE SET NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS scene_connections (
      id              TEXT PRIMARY KEY NOT NULL,
      campaign_id     TEXT NOT NULL,
      from_scene_id   TEXT NOT NULL,
      to_scene_id     TEXT NOT NULL,
      connection_type TEXT NOT NULL,
      label           TEXT,
      is_bidirectional INTEGER NOT NULL DEFAULT 0 CHECK (is_bidirectional IN (0,1)),
      conditions_json TEXT,
      priority        INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (from_scene_id) REFERENCES scenes(id) ON DELETE CASCADE,
      FOREIGN KEY (to_scene_id) REFERENCES scenes(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS quests (
      id                  TEXT PRIMARY KEY NOT NULL,
      campaign_id         TEXT NOT NULL,
      parent_quest_id     TEXT,
      title               TEXT NOT NULL,
      category            TEXT NOT NULL,
      status              TEXT NOT NULL,
      summary             TEXT,
      description         TEXT,
      giver_npc_id        TEXT,
      target_location_id  TEXT,
      requirements_json   TEXT,
      rewards_json        TEXT,
      progress_json       TEXT,
      started_at          TEXT,
      completed_at        TEXT,
      created_at          TEXT NOT NULL,
      updated_at          TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_quest_id) REFERENCES quests(id) ON DELETE SET NULL,
      FOREIGN KEY (giver_npc_id) REFERENCES npcs(id) ON DELETE SET NULL,
      FOREIGN KEY (target_location_id) REFERENCES locations(id) ON DELETE SET NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS encounters (
      id              TEXT PRIMARY KEY NOT NULL,
      campaign_id     TEXT NOT NULL,
      scene_id        TEXT NOT NULL,
      name            TEXT NOT NULL,
      encounter_type  TEXT NOT NULL,
      status          TEXT NOT NULL DEFAULT 'pending',
      difficulty      TEXT,
      summary         TEXT,
      setup_json      TEXT,
      resolution_json TEXT,
      started_at      TEXT,
      ended_at        TEXT,
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id             TEXT PRIMARY KEY NOT NULL,
      campaign_id    TEXT NOT NULL,
      name           TEXT NOT NULL,
      item_type      TEXT NOT NULL,
      rarity         TEXT,
      stackable      INTEGER NOT NULL DEFAULT 0 CHECK (stackable IN (0,1)),
      equippable     INTEGER NOT NULL DEFAULT 0 CHECK (equippable IN (0,1)),
      weight         REAL,
      value_amount   INTEGER,
      value_currency TEXT,
      description    TEXT,
      effects_json   TEXT,
      image_asset_id TEXT,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (image_asset_id) REFERENCES image_assets(id) ON DELETE SET NULL,
      UNIQUE (campaign_id, name)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id             TEXT PRIMARY KEY NOT NULL,
      campaign_id    TEXT NOT NULL,
      item_id        TEXT NOT NULL,
      owner_type     TEXT NOT NULL,
      owner_id       TEXT NOT NULL,
      quantity       INTEGER NOT NULL DEFAULT 1,
      is_equipped    INTEGER NOT NULL DEFAULT 0 CHECK (is_equipped IN (0,1)),
      slot           TEXT,
      condition_text TEXT,
      notes          TEXT,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS turns (
      id               TEXT PRIMARY KEY NOT NULL,
      campaign_id      TEXT NOT NULL,
      scene_id         TEXT NOT NULL,
      player_input     TEXT NOT NULL,
      intent_json      TEXT,
      rules_result_json TEXT NOT NULL,
      narration_text   TEXT NOT NULL,
      media_plan_json  TEXT,
      created_at       TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS turn_events (
      id           TEXT PRIMARY KEY NOT NULL,
      turn_id      TEXT NOT NULL,
      campaign_id  TEXT NOT NULL,
      scene_id     TEXT,
      event_type   TEXT NOT NULL,
      actor_type   TEXT,
      actor_id     TEXT,
      target_type  TEXT,
      target_id    TEXT,
      payload_json TEXT NOT NULL,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL,
      FOREIGN KEY (turn_id) REFERENCES turns(id) ON DELETE CASCADE,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE SET NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id             TEXT PRIMARY KEY NOT NULL,
      campaign_id    TEXT NOT NULL,
      entity_type    TEXT NOT NULL,
      entity_id      TEXT,
      memory_type    TEXT NOT NULL,
      content        TEXT NOT NULL,
      importance     INTEGER NOT NULL DEFAULT 1,
      source_turn_id TEXT,
      created_at     TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (source_turn_id) REFERENCES turns(id) ON DELETE SET NULL
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS campaign_flags (
      id          TEXT PRIMARY KEY NOT NULL,
      campaign_id TEXT NOT NULL,
      scope_type  TEXT NOT NULL DEFAULT 'campaign',
      scope_id    TEXT,
      key         TEXT NOT NULL,
      value       TEXT,
      value_type  TEXT NOT NULL DEFAULT 'string',
      updated_at  TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      UNIQUE (campaign_id, scope_type, scope_id, key)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS scenario_imports (
      id                    TEXT PRIMARY KEY NOT NULL,
      campaign_id           TEXT,
      source_type           TEXT NOT NULL,
      source_path           TEXT NOT NULL,
      original_filename     TEXT,
      status                TEXT NOT NULL,
      detected_title        TEXT,
      raw_text_path         TEXT,
      normalized_json_path  TEXT,
      validation_report_json TEXT,
      error_message         TEXT,
      started_at            TEXT NOT NULL,
      finished_at           TEXT,
      created_at            TEXT NOT NULL,
      updated_at            TEXT NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
    )
  `)

  // Indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_players_campaign_id ON players(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_characters_campaign_id ON characters(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_npcs_campaign_id ON npcs(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_npcs_location_id ON npcs(location_id);
    CREATE INDEX IF NOT EXISTS idx_npcs_faction_id ON npcs(faction_id);
    CREATE INDEX IF NOT EXISTS idx_factions_campaign_id ON factions(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_locations_campaign_id ON locations(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_locations_parent_location_id ON locations(parent_location_id);
    CREATE INDEX IF NOT EXISTS idx_scenes_campaign_id ON scenes(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_scenes_location_id ON scenes(location_id);
    CREATE INDEX IF NOT EXISTS idx_scene_connections_campaign_id ON scene_connections(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_scene_connections_from_scene_id ON scene_connections(from_scene_id);
    CREATE INDEX IF NOT EXISTS idx_scene_connections_to_scene_id ON scene_connections(to_scene_id);
    CREATE INDEX IF NOT EXISTS idx_quests_campaign_id ON quests(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_quests_parent_quest_id ON quests(parent_quest_id);
    CREATE INDEX IF NOT EXISTS idx_encounters_campaign_id ON encounters(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_encounters_scene_id ON encounters(scene_id);
    CREATE INDEX IF NOT EXISTS idx_items_campaign_id ON items(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_items_campaign_id ON inventory_items(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_items_item_id ON inventory_items(item_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_items_owner ON inventory_items(owner_type, owner_id);
    CREATE INDEX IF NOT EXISTS idx_campaign_flags_campaign_scope_key ON campaign_flags(campaign_id, scope_type, scope_id, key);
    CREATE INDEX IF NOT EXISTS idx_turns_campaign_created_at ON turns(campaign_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_turns_scene_id ON turns(scene_id);
    CREATE INDEX IF NOT EXISTS idx_turn_events_turn_id ON turn_events(turn_id);
    CREATE INDEX IF NOT EXISTS idx_turn_events_campaign_id ON turn_events(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_memories_campaign_entity ON memories(campaign_id, entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_memories_source_turn_id ON memories(source_turn_id);
    CREATE INDEX IF NOT EXISTS idx_voice_profiles_campaign_id ON voice_profiles(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_audio_cues_campaign_id ON audio_cues(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_image_assets_campaign_entity ON image_assets(campaign_id, entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_scenario_imports_campaign_id ON scenario_imports(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_scenario_imports_status ON scenario_imports(status);
  `)
}
