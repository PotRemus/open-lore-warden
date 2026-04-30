import { sceneDbRepository, SceneDto } from '@/db/repositories/scene.db.repository'
import { audioCueDbRepository, AudioCueDto } from '@/db/repositories/audio-cue.db.repository'
import { sceneConnectionDbRepository, SceneConnectionDto } from '@/db/repositories/scene-connection.db.repository'
import { encounterDbRepository, EncounterDto } from '@/db/repositories/encounter.db.repository'
import { locationRepository } from '@/repositories/location.repository'
import type { Scene, CreateScene, UpdateScene, AudioCue, SceneConnection, Encounter } from '@open-lore-warden/domain'

function toScene(dto: SceneDto): Scene {
  let audioCue: AudioCue | undefined
  if (dto.audio_cue_id) {
    const audioCueDto = audioCueDbRepository.findById(dto.audio_cue_id)
    if (audioCueDto) audioCue = toAudioCue(audioCueDto)
  }

  return {
    id: dto.id,
    campaignId: dto.campaign_id,
    locationId: dto.location_id ?? undefined,
    name: dto.name,
    sceneType: dto.scene_type,
    status: dto.status,
    intensity: dto.intensity ?? undefined,
    entryConditionsJson: dto.entry_conditions_json ?? undefined,
    exitConditionsJson: dto.exit_conditions_json ?? undefined,
    audioCueId: dto.audio_cue_id ?? undefined,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    location: dto.location_id ? locationRepository.findById(dto.location_id) : undefined,
    audioCue: audioCue,
    connections: toConnections(sceneConnectionDbRepository.findByFromSceneId(dto.id)),
    encounters: toEncounters(encounterDbRepository.findBySceneId(dto.id)),
  }
}

function toEncounters(dto: EncounterDto[]): Encounter[] {
  const result: Encounter[] = dto.map(d => {
    return {
      id: d.id,
      campaignId: d.campaign_id,
      sceneId: d.scene_id,
      name: d.name,
      encounterType: d.encounter_type,
      status: d.status,
      difficulty: d.difficulty ?? undefined,
      summary: d.summary ?? undefined,
      setupJson: d.setup_json ?? undefined,
      resolutionJson: d.resolution_json ?? undefined,
      startedAt: d.started_at ?? undefined,
      endedAt: d.ended_at ?? undefined,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }
  })
  return result
}

function toConnections(dto: SceneConnectionDto[]): SceneConnection[] {
  const result: SceneConnection[] = dto.map(d => {
    return {
      id: d.id,
      campaignId: d.campaign_id,
      fromSceneId: d.from_scene_id,
      toSceneId: d.to_scene_id,
      connectionType: d.connection_type,
      label: d.label ?? undefined,
      isBidirectional: d.is_bidirectional ? true : false,
      conditionsJson: d.conditions_json ?? undefined,
      priority: d.priority,
      createdAt: d.created_at,
    }
  })
  return result
}

function toAudioCue(dto: AudioCueDto): AudioCue {
  const result: AudioCue = {
    id: dto.id,
    campaignId: dto.campaign_id ?? undefined,
    name: dto.name,
    cueType: dto.cue_type,
    category: dto.category ?? undefined,
    filePath: dto.file_path,
    loop: dto.loop ? true : false,
    defaultVolume: dto.default_volume,
    fadeInMs: dto.fade_in_ms,
    fadeOutMs: dto.fade_out_ms,
    tagsJson: dto.tags_json ?? undefined,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
  return result
}

export const sceneRepository = {
  create(input: CreateScene): Scene {
    return toScene(sceneDbRepository.create(input))
  },

  findById(id: string): Scene | undefined {
    const dto = sceneDbRepository.findById(id)
    if (!dto) return undefined
    return toScene(dto)
  },

  findByCampaignId(campaignId: string): Scene[] {
    return sceneDbRepository.findByCampaignId(campaignId).map(toScene)
  },

  update(id: string, input: UpdateScene): Scene | undefined {
    const dto = sceneDbRepository.update(id, input)
    if (!dto) return undefined
    return toScene(dto)
  },

  delete(id: string): boolean {
    return sceneDbRepository.delete(id)
  },
}
