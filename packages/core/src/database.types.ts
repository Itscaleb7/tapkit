
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ai_usage": {
                  Row: {
                    "created_at": string,"id": number,"input_tokens": number | null,"latency_ms": number | null,"metered": boolean,"model": string | null,"output_tokens": number | null,"prompt_version": string | null,"status": string,"task": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"input_tokens"?: number | null,"latency_ms"?: number | null,"metered"?: boolean,"model"?: string | null,"output_tokens"?: number | null,"prompt_version"?: string | null,"status": string,"task": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"input_tokens"?: number | null,"latency_ms"?: number | null,"metered"?: boolean,"model"?: string | null,"output_tokens"?: number | null,"prompt_version"?: string | null,"status"?: string,"task"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"blueprints": {
                  Row: {
                    "content": NonNullable<Json>,"created_at": string,"decided_at": string | null,"feedback": string | null,"id": string,"input_snapshot": Json | null,"model": string | null,"prompt_version": string | null,"source": string,"status": Database["public"]['Enums']["blueprint_status"],"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "content": NonNullable<Json>,"created_at"?: string,"decided_at"?: string | null,"feedback"?: string | null,"id"?: string,"input_snapshot"?: Json | null,"model"?: string | null,"prompt_version"?: string | null,"source"?: string,"status"?: Database["public"]['Enums']["blueprint_status"],"user_id": string,"version": number
                  }
                  Update: {
                    "content"?: NonNullable<Json>,"created_at"?: string,"decided_at"?: string | null,"feedback"?: string | null,"id"?: string,"input_snapshot"?: Json | null,"model"?: string | null,"prompt_version"?: string | null,"source"?: string,"status"?: Database["public"]['Enums']["blueprint_status"],"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"brand_profiles": {
                  Row: {
                    "audience": string | null,"audience_needs": (string)[],"brand_promise": string | null,"current_blueprint_id": string | null,"differentiators": (string)[],"goals": (string)[],"long_term_objectives": string | null,"monetisation_interests": (string)[],"platforms": (string)[],"positioning": string | null,"posts_per_week": number | null,"stage": string | null,"updated_at": string,"user_id": string,"values": (string)[],"visual_preferences": string | null,"voice_avoid": (string)[],"voice_do": (string)[],"voice_summary": string | null,"voice_traits": (string)[]
                  }
                  ComputedFields: never
                  Insert: {
                    "audience"?: string | null,"audience_needs"?: (string)[],"brand_promise"?: string | null,"current_blueprint_id"?: string | null,"differentiators"?: (string)[],"goals"?: (string)[],"long_term_objectives"?: string | null,"monetisation_interests"?: (string)[],"platforms"?: (string)[],"positioning"?: string | null,"posts_per_week"?: number | null,"stage"?: string | null,"updated_at"?: string,"user_id": string,"values"?: (string)[],"visual_preferences"?: string | null,"voice_avoid"?: (string)[],"voice_do"?: (string)[],"voice_summary"?: string | null,"voice_traits"?: (string)[]
                  }
                  Update: {
                    "audience"?: string | null,"audience_needs"?: (string)[],"brand_promise"?: string | null,"current_blueprint_id"?: string | null,"differentiators"?: (string)[],"goals"?: (string)[],"long_term_objectives"?: string | null,"monetisation_interests"?: (string)[],"platforms"?: (string)[],"positioning"?: string | null,"posts_per_week"?: number | null,"stage"?: string | null,"updated_at"?: string,"user_id"?: string,"values"?: (string)[],"visual_preferences"?: string | null,"voice_avoid"?: (string)[],"voice_do"?: (string)[],"voice_summary"?: string | null,"voice_traits"?: (string)[]
                  }
                  Relationships: [
                    {
      foreignKeyName: "brand_profiles_current_blueprint_id_fkey"
      columns: ["current_blueprint_id"]
isOneToOne: false
      referencedRelation: "blueprints"
      referencedColumns: ["id"]
    }
                  ]
                },"brand_versions": {
                  Row: {
                    "change_summary": string,"created_at": string,"id": string,"snapshot": NonNullable<Json>,"source": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "change_summary": string,"created_at"?: string,"id"?: string,"snapshot": NonNullable<Json>,"source"?: string,"user_id": string
                  }
                  Update: {
                    "change_summary"?: string,"created_at"?: string,"id"?: string,"snapshot"?: NonNullable<Json>,"source"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"content_pillars": {
                  Row: {
                    "created_at": string,"description": string | null,"example_topics": (string)[],"id": string,"is_active": boolean,"name": string,"origin": string,"position": number,"rationale": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"example_topics"?: (string)[],"id"?: string,"is_active"?: boolean,"name": string,"origin"?: string,"position"?: number,"rationale"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"example_topics"?: (string)[],"id"?: string,"is_active"?: boolean,"name"?: string,"origin"?: string,"position"?: number,"rationale"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"content_projects": {
                  Row: {
                    "alternative_hooks": (string)[],"caption": string | null,"created_at": string,"cta": string | null,"experiment_id": string | null,"format": Database["public"]['Enums']["content_format"],"generation_meta": Json | null,"generation_source": string | null,"grounding_notes": string | null,"hashtags": (string)[],"hook": string | null,"id": string,"pillar_id": string | null,"platform": string | null,"published_at": string | null,"published_confirmed": boolean,"published_url": string | null,"series_ideas": (string)[],"series_name": string | null,"slides": NonNullable<Json>,"status": Database["public"]['Enums']["content_status"],"theme_id": string,"title": string,"topic": string | null,"updated_at": string,"user_edited": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "alternative_hooks"?: (string)[],"caption"?: string | null,"created_at"?: string,"cta"?: string | null,"experiment_id"?: string | null,"format"?: Database["public"]['Enums']["content_format"],"generation_meta"?: Json | null,"generation_source"?: string | null,"grounding_notes"?: string | null,"hashtags"?: (string)[],"hook"?: string | null,"id"?: string,"pillar_id"?: string | null,"platform"?: string | null,"published_at"?: string | null,"published_confirmed"?: boolean,"published_url"?: string | null,"series_ideas"?: (string)[],"series_name"?: string | null,"slides"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["content_status"],"theme_id"?: string,"title": string,"topic"?: string | null,"updated_at"?: string,"user_edited"?: boolean,"user_id": string
                  }
                  Update: {
                    "alternative_hooks"?: (string)[],"caption"?: string | null,"created_at"?: string,"cta"?: string | null,"experiment_id"?: string | null,"format"?: Database["public"]['Enums']["content_format"],"generation_meta"?: Json | null,"generation_source"?: string | null,"grounding_notes"?: string | null,"hashtags"?: (string)[],"hook"?: string | null,"id"?: string,"pillar_id"?: string | null,"platform"?: string | null,"published_at"?: string | null,"published_confirmed"?: boolean,"published_url"?: string | null,"series_ideas"?: (string)[],"series_name"?: string | null,"slides"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["content_status"],"theme_id"?: string,"title"?: string,"topic"?: string | null,"updated_at"?: string,"user_edited"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_projects_experiment_id_fkey"
      columns: ["experiment_id"]
isOneToOne: false
      referencedRelation: "experiments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_projects_pillar_id_fkey"
      columns: ["pillar_id"]
isOneToOne: false
      referencedRelation: "content_pillars"
      referencedColumns: ["id"]
    }
                  ]
                },"content_sources": {
                  Row: {
                    "content_id": string,"proof_entry_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_id": string,"proof_entry_id": string,"user_id": string
                  }
                  Update: {
                    "content_id"?: string,"proof_entry_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "content_sources_content_id_fkey"
      columns: ["content_id"]
isOneToOne: false
      referencedRelation: "content_projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "content_sources_proof_entry_id_fkey"
      columns: ["proof_entry_id"]
isOneToOne: false
      referencedRelation: "proof_entries"
      referencedColumns: ["id"]
    }
                  ]
                },"enquiry_rate": {
                  Row: {
                    "count": number,"day": string,"portfolio_user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "count"?: number,"day"?: string,"portfolio_user_id": string
                  }
                  Update: {
                    "count"?: number,"day"?: string,"portfolio_user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"experiments": {
                  Row: {
                    "analysed_at": string | null,"analysis": Json | null,"analysis_stats": Json | null,"conclusion": string | null,"created_at": string,"end_date": string,"format": string | null,"hypothesis": string,"id": string,"next_action": string | null,"objective": string | null,"pillar_id": string | null,"planned_posts": number,"platform": string | null,"results_summary": string | null,"start_date": string,"status": Database["public"]['Enums']["experiment_status"],"success_metrics": (string)[],"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "analysed_at"?: string | null,"analysis"?: Json | null,"analysis_stats"?: Json | null,"conclusion"?: string | null,"created_at"?: string,"end_date": string,"format"?: string | null,"hypothesis": string,"id"?: string,"next_action"?: string | null,"objective"?: string | null,"pillar_id"?: string | null,"planned_posts"?: number,"platform"?: string | null,"results_summary"?: string | null,"start_date": string,"status"?: Database["public"]['Enums']["experiment_status"],"success_metrics"?: (string)[],"title": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "analysed_at"?: string | null,"analysis"?: Json | null,"analysis_stats"?: Json | null,"conclusion"?: string | null,"created_at"?: string,"end_date"?: string,"format"?: string | null,"hypothesis"?: string,"id"?: string,"next_action"?: string | null,"objective"?: string | null,"pillar_id"?: string | null,"planned_posts"?: number,"platform"?: string | null,"results_summary"?: string | null,"start_date"?: string,"status"?: Database["public"]['Enums']["experiment_status"],"success_metrics"?: (string)[],"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "experiments_pillar_id_fkey"
      columns: ["pillar_id"]
isOneToOne: false
      referencedRelation: "content_pillars"
      referencedColumns: ["id"]
    }
                  ]
                },"export_usage": {
                  Row: {
                    "content_id": string | null,"created_at": string,"id": number,"kind": string,"slide_count": number,"theme_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_id"?: string | null,"created_at"?: string,"id"?: never,"kind": string,"slide_count": number,"theme_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "content_id"?: string | null,"created_at"?: string,"id"?: never,"kind"?: string,"slide_count"?: number,"theme_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "export_usage_content_id_fkey"
      columns: ["content_id"]
isOneToOne: false
      referencedRelation: "content_projects"
      referencedColumns: ["id"]
    }
                  ]
                },"lead_activities": {
                  Row: {
                    "id": string,"kind": Database["public"]['Enums']["lead_activity_kind"],"lead_id": string,"occurred_at": string,"summary": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"kind": Database["public"]['Enums']["lead_activity_kind"],"lead_id": string,"occurred_at"?: string,"summary": string,"user_id": string
                  }
                  Update: {
                    "id"?: string,"kind"?: Database["public"]['Enums']["lead_activity_kind"],"lead_id"?: string,"occurred_at"?: string,"summary"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lead_activities_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "leads"
      referencedColumns: ["id"]
    }
                  ]
                },"leads": {
                  Row: {
                    "company": string | null,"created_at": string,"email": string | null,"enquiry_message": string | null,"id": string,"kind": Database["public"]['Enums']["lead_kind"],"name": string,"next_follow_up": string | null,"notes": string | null,"offer_id": string | null,"source": string,"stage": Database["public"]['Enums']["lead_stage"],"updated_at": string,"url": string | null,"user_id": string,"value_amount": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "company"?: string | null,"created_at"?: string,"email"?: string | null,"enquiry_message"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["lead_kind"],"name": string,"next_follow_up"?: string | null,"notes"?: string | null,"offer_id"?: string | null,"source"?: string,"stage"?: Database["public"]['Enums']["lead_stage"],"updated_at"?: string,"url"?: string | null,"user_id": string,"value_amount"?: number | null
                  }
                  Update: {
                    "company"?: string | null,"created_at"?: string,"email"?: string | null,"enquiry_message"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["lead_kind"],"name"?: string,"next_follow_up"?: string | null,"notes"?: string | null,"offer_id"?: string | null,"source"?: string,"stage"?: Database["public"]['Enums']["lead_stage"],"updated_at"?: string,"url"?: string | null,"user_id"?: string,"value_amount"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "leads_offer_id_fkey"
      columns: ["offer_id"]
isOneToOne: false
      referencedRelation: "offers"
      referencedColumns: ["id"]
    }
                  ]
                },"metric_snapshots": {
                  Row: {
                    "captured_on": string,"comments": number | null,"content_id": string | null,"enquiries": number | null,"experiment_id": string | null,"follower_change": number | null,"id": string,"impressions": number | null,"likes": number | null,"link_clicks": number | null,"notes": string | null,"platform": string,"profile_visits": number | null,"reach": number | null,"recorded_at": string,"saves": number | null,"shares": number | null,"source": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "captured_on"?: string,"comments"?: number | null,"content_id"?: string | null,"enquiries"?: number | null,"experiment_id"?: string | null,"follower_change"?: number | null,"id"?: string,"impressions"?: number | null,"likes"?: number | null,"link_clicks"?: number | null,"notes"?: string | null,"platform": string,"profile_visits"?: number | null,"reach"?: number | null,"recorded_at"?: string,"saves"?: number | null,"shares"?: number | null,"source"?: string,"user_id": string
                  }
                  Update: {
                    "captured_on"?: string,"comments"?: number | null,"content_id"?: string | null,"enquiries"?: number | null,"experiment_id"?: string | null,"follower_change"?: number | null,"id"?: string,"impressions"?: number | null,"likes"?: number | null,"link_clicks"?: number | null,"notes"?: string | null,"platform"?: string,"profile_visits"?: number | null,"reach"?: number | null,"recorded_at"?: string,"saves"?: number | null,"shares"?: number | null,"source"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "metric_snapshots_content_id_fkey"
      columns: ["content_id"]
isOneToOne: false
      referencedRelation: "content_projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "metric_snapshots_experiment_id_fkey"
      columns: ["experiment_id"]
isOneToOne: false
      referencedRelation: "experiments"
      referencedColumns: ["id"]
    }
                  ]
                },"offers": {
                  Row: {
                    "ai_assist": Json | null,"audience": string | null,"created_at": string,"cta_url": string | null,"currency": string,"deliverables": (string)[],"description": string | null,"differentiation": string | null,"evidence_entry_ids": (string)[],"id": string,"is_public": boolean,"offer_type": Database["public"]['Enums']["offer_type"],"price_amount": number | null,"pricing_hypothesis": string | null,"problem": string | null,"status": Database["public"]['Enums']["offer_status"],"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_assist"?: Json | null,"audience"?: string | null,"created_at"?: string,"cta_url"?: string | null,"currency"?: string,"deliverables"?: (string)[],"description"?: string | null,"differentiation"?: string | null,"evidence_entry_ids"?: (string)[],"id"?: string,"is_public"?: boolean,"offer_type"?: Database["public"]['Enums']["offer_type"],"price_amount"?: number | null,"pricing_hypothesis"?: string | null,"problem"?: string | null,"status"?: Database["public"]['Enums']["offer_status"],"title": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "ai_assist"?: Json | null,"audience"?: string | null,"created_at"?: string,"cta_url"?: string | null,"currency"?: string,"deliverables"?: (string)[],"description"?: string | null,"differentiation"?: string | null,"evidence_entry_ids"?: (string)[],"id"?: string,"is_public"?: boolean,"offer_type"?: Database["public"]['Enums']["offer_type"],"price_amount"?: number | null,"pricing_hypothesis"?: string | null,"problem"?: string | null,"status"?: Database["public"]['Enums']["offer_status"],"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"onboarding_responses": {
                  Row: {
                    "answers": NonNullable<Json>,"current_step": number,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: NonNullable<Json>,"current_step"?: number,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "answers"?: NonNullable<Json>,"current_step"?: number,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"plan_limits": {
                  Row: {
                    "key": string,"plan": string,"value": number
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"plan": string,"value": number
                  }
                  Update: {
                    "key"?: string,"plan"?: string,"value"?: number
                  }
                  Relationships: [
                    
                  ]
                },"portfolio_items": {
                  Row: {
                    "content_id": string | null,"created_at": string,"description": string | null,"id": string,"is_visible": boolean,"kind": string,"position": number,"title": string,"url": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "content_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_visible"?: boolean,"kind": string,"position"?: number,"title": string,"url"?: string | null,"user_id": string
                  }
                  Update: {
                    "content_id"?: string | null,"created_at"?: string,"description"?: string | null,"id"?: string,"is_visible"?: boolean,"kind"?: string,"position"?: number,"title"?: string,"url"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "portfolio_items_content_id_fkey"
      columns: ["content_id"]
isOneToOne: false
      referencedRelation: "content_projects"
      referencedColumns: ["id"]
    }
                  ]
                },"portfolios": {
                  Row: {
                    "accent_color": string,"avatar_path": string | null,"bio": string | null,"contact_email": string | null,"contact_url": string | null,"created_at": string,"display_name": string,"enquiries_enabled": boolean,"experience": string | null,"headline": string | null,"is_published": boolean,"positioning": string | null,"published_at": string | null,"show_content": boolean,"show_offers": boolean,"skills": (string)[],"slug": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accent_color"?: string,"avatar_path"?: string | null,"bio"?: string | null,"contact_email"?: string | null,"contact_url"?: string | null,"created_at"?: string,"display_name": string,"enquiries_enabled"?: boolean,"experience"?: string | null,"headline"?: string | null,"is_published"?: boolean,"positioning"?: string | null,"published_at"?: string | null,"show_content"?: boolean,"show_offers"?: boolean,"skills"?: (string)[],"slug": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "accent_color"?: string,"avatar_path"?: string | null,"bio"?: string | null,"contact_email"?: string | null,"contact_url"?: string | null,"created_at"?: string,"display_name"?: string,"enquiries_enabled"?: boolean,"experience"?: string | null,"headline"?: string | null,"is_published"?: boolean,"positioning"?: string | null,"published_at"?: string | null,"show_content"?: boolean,"show_offers"?: boolean,"skills"?: (string)[],"slug"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"handle": string | null,"id": string,"marketing_opt_in": boolean,"onboarding_completed_at": string | null,"timezone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"handle"?: string | null,"id": string,"marketing_opt_in"?: boolean,"onboarding_completed_at"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"handle"?: string | null,"id"?: string,"marketing_opt_in"?: boolean,"onboarding_completed_at"?: string | null,"timezone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"proof_entries": {
                  Row: {
                    "ai_suggestion": Json | null,"audience_relevance": string | null,"audio_duration_ms": number | null,"audio_path": string | null,"body": string | null,"classification_status": Database["public"]['Enums']["classification_status"],"content_angles": (string)[],"created_at": string,"id": string,"key_insight": string | null,"kind": Database["public"]['Enums']["proof_kind"],"link_title": string | null,"link_url": string | null,"occurred_on": string | null,"pillar_id": string | null,"pinned": boolean,"search": unknown,"tags": (string)[],"title": string | null,"transcript": string | null,"transcription_status": string | null,"updated_at": string,"used_count": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ai_suggestion"?: Json | null,"audience_relevance"?: string | null,"audio_duration_ms"?: number | null,"audio_path"?: string | null,"body"?: string | null,"classification_status"?: Database["public"]['Enums']["classification_status"],"content_angles"?: (string)[],"created_at"?: string,"id"?: string,"key_insight"?: string | null,"kind"?: Database["public"]['Enums']["proof_kind"],"link_title"?: string | null,"link_url"?: string | null,"occurred_on"?: string | null,"pillar_id"?: string | null,"pinned"?: boolean,"search"?: never,"tags"?: (string)[],"title"?: string | null,"transcript"?: string | null,"transcription_status"?: string | null,"updated_at"?: string,"used_count"?: number,"user_id": string
                  }
                  Update: {
                    "ai_suggestion"?: Json | null,"audience_relevance"?: string | null,"audio_duration_ms"?: number | null,"audio_path"?: string | null,"body"?: string | null,"classification_status"?: Database["public"]['Enums']["classification_status"],"content_angles"?: (string)[],"created_at"?: string,"id"?: string,"key_insight"?: string | null,"kind"?: Database["public"]['Enums']["proof_kind"],"link_title"?: string | null,"link_url"?: string | null,"occurred_on"?: string | null,"pillar_id"?: string | null,"pinned"?: boolean,"search"?: never,"tags"?: (string)[],"title"?: string | null,"transcript"?: string | null,"transcription_status"?: string | null,"updated_at"?: string,"used_count"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "proof_entries_pillar_id_fkey"
      columns: ["pillar_id"]
isOneToOne: false
      referencedRelation: "content_pillars"
      referencedColumns: ["id"]
    }
                  ]
                },"recommendations": {
                  Row: {
                    "change_type": string,"created_at": string,"decided_at": string | null,"decision_note": string | null,"id": string,"proposed_change": string,"rationale": string,"source": string,"source_id": string | null,"status": Database["public"]['Enums']["recommendation_status"],"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "change_type": string,"created_at"?: string,"decided_at"?: string | null,"decision_note"?: string | null,"id"?: string,"proposed_change": string,"rationale": string,"source": string,"source_id"?: string | null,"status"?: Database["public"]['Enums']["recommendation_status"],"title": string,"user_id": string
                  }
                  Update: {
                    "change_type"?: string,"created_at"?: string,"decided_at"?: string | null,"decision_note"?: string | null,"id"?: string,"proposed_change"?: string,"rationale"?: string,"source"?: string,"source_id"?: string | null,"status"?: Database["public"]['Enums']["recommendation_status"],"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"revenuecat_events": {
                  Row: {
                    "app_user_id": string | null,"event_type": string,"id": string,"received_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "app_user_id"?: string | null,"event_type": string,"id": string,"received_at"?: string
                  }
                  Update: {
                    "app_user_id"?: string | null,"event_type"?: string,"id"?: string,"received_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"strategic_decisions": {
                  Row: {
                    "created_at": string,"decision": string,"id": string,"rationale": string | null,"recommendation_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decision": string,"id"?: string,"rationale"?: string | null,"recommendation_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"decision"?: string,"id"?: string,"rationale"?: string | null,"recommendation_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "strategic_decisions_recommendation_id_fkey"
      columns: ["recommendation_id"]
isOneToOne: false
      referencedRelation: "recommendations"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "billing_issue_detected_at": string | null,"entitlement": string,"environment": string | null,"expires_at": string | null,"grace_period_expires_at": string | null,"is_active": boolean,"last_event_type": string | null,"last_synced_at": string,"period_type": string | null,"product_id": string | null,"store": string | null,"unsubscribe_detected_at": string | null,"updated_at": string,"user_id": string,"will_renew": boolean | null
                  }
                  ComputedFields: never
                  Insert: {
                    "billing_issue_detected_at"?: string | null,"entitlement"?: string,"environment"?: string | null,"expires_at"?: string | null,"grace_period_expires_at"?: string | null,"is_active"?: boolean,"last_event_type"?: string | null,"last_synced_at"?: string,"period_type"?: string | null,"product_id"?: string | null,"store"?: string | null,"unsubscribe_detected_at"?: string | null,"updated_at"?: string,"user_id": string,"will_renew"?: boolean | null
                  }
                  Update: {
                    "billing_issue_detected_at"?: string | null,"entitlement"?: string,"environment"?: string | null,"expires_at"?: string | null,"grace_period_expires_at"?: string | null,"is_active"?: boolean,"last_event_type"?: string | null,"last_synced_at"?: string,"period_type"?: string | null,"product_id"?: string | null,"store"?: string | null,"unsubscribe_detected_at"?: string | null,"updated_at"?: string,"user_id"?: string,"will_renew"?: boolean | null
                  }
                  Relationships: [
                    
                  ]
                },"weekly_reviews": {
                  Row: {
                    "created_at": string,"facts": NonNullable<Json>,"id": string,"model": string | null,"prompt_version": string | null,"review": NonNullable<Json>,"user_id": string,"week_start": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"facts": NonNullable<Json>,"id"?: string,"model"?: string | null,"prompt_version"?: string | null,"review": NonNullable<Json>,"user_id": string,"week_start": string
                  }
                  Update: {
                    "created_at"?: string,"facts"?: NonNullable<Json>,"id"?: string,"model"?: string | null,"prompt_version"?: string | null,"review"?: NonNullable<Json>,"user_id"?: string,"week_start"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_blueprint":
{ Args: { "p_blueprint_id": string,"p_replace_pillars"?: boolean }; Returns: undefined
                           },
"ai_generations_used":
{ Args: { "uid": string }; Returns: number
                           },
"brand_snapshot":
{ Args: { "uid": string }; Returns: Json
                           },
"current_plan":
{ Args: { "uid": string }; Returns: string
                           },
"decide_recommendation":
{ Args: { "p_id": string,"p_note"?: string,"p_status": Database["public"]['Enums']["recommendation_status"] }; Returns: undefined
                           },
"exports_used":
{ Args: { "uid": string }; Returns: number
                           },
"get_entitlement":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_home_state":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_public_portfolio":
{ Args: { "p_slug": string }; Returns: Json
                           },
"increment_proof_usage":
{ Args: { "p_entry_id": string,"p_user_id": string }; Returns: undefined
                           },
"is_pro":
{ Args: { "uid": string }; Returns: boolean
                           },
"is_slug_available":
{ Args: { "p_slug": string }; Returns: boolean
                           },
"month_start":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"plan_limit":
{ Args: { "limit_key": string,"uid": string }; Returns: number
                           },
"record_export":
{ Args: { "p_content_id": string,"p_kind": string,"p_slide_count": number,"p_theme_id": string }; Returns: Json
                           },
"save_brand_profile":
{ Args: { "p_change_summary": string,"p_patch": Json }; Returns: undefined
                           },
"submit_portfolio_enquiry":
{ Args: { "p_email": string,"p_message": string,"p_name": string,"p_slug": string }; Returns: Json
                           },
"tags_to_text":
{ Args: { "tags": (string)[] }; Returns: string
                           }
          }
          Enums: {
            "blueprint_status": "generated"|"accepted"|"rejected"|"superseded","classification_status": "pending"|"done"|"failed"|"skipped"|"manual","content_format": "carousel"|"single_image"|"educational"|"personal_story"|"opinion"|"how_to"|"list"|"myth_fact"|"comparison"|"caption"|"hooks","content_status": "idea"|"draft"|"ready"|"published"|"archived","experiment_status": "planned"|"running"|"completed"|"abandoned","lead_activity_kind": "outreach"|"reply"|"meeting"|"proposal"|"note"|"outcome","lead_kind": "client"|"lead"|"partner"|"employer"|"collaborator","lead_stage": "identified"|"contacted"|"replied"|"meeting"|"proposal"|"won"|"lost","offer_status": "draft"|"active"|"archived","offer_type": "freelance"|"consulting"|"digital_product"|"partnership"|"newsletter"|"speaking"|"career"|"other","proof_kind": "note"|"idea"|"opinion"|"lesson"|"story"|"achievement"|"challenge"|"project_update"|"observation"|"link"|"voice","recommendation_status": "pending"|"accepted"|"rejected"|"deferred"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "blueprint_status": ["generated", "accepted", "rejected", "superseded"],"classification_status": ["pending", "done", "failed", "skipped", "manual"],"content_format": ["carousel", "single_image", "educational", "personal_story", "opinion", "how_to", "list", "myth_fact", "comparison", "caption", "hooks"],"content_status": ["idea", "draft", "ready", "published", "archived"],"experiment_status": ["planned", "running", "completed", "abandoned"],"lead_activity_kind": ["outreach", "reply", "meeting", "proposal", "note", "outcome"],"lead_kind": ["client", "lead", "partner", "employer", "collaborator"],"lead_stage": ["identified", "contacted", "replied", "meeting", "proposal", "won", "lost"],"offer_status": ["draft", "active", "archived"],"offer_type": ["freelance", "consulting", "digital_product", "partnership", "newsletter", "speaking", "career", "other"],"proof_kind": ["note", "idea", "opinion", "lesson", "story", "achievement", "challenge", "project_update", "observation", "link", "voice"],"recommendation_status": ["pending", "accepted", "rejected", "deferred"]
          }
        }
} as const
