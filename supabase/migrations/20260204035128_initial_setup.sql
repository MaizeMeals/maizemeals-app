
  create table "public"."dining_halls" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "name" text not null,
    "slug" text not null
      );



  create table "public"."items" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "dining_hall_id" uuid not null,
    "name" text not null,
    "normalized_name" text,
    "nutrition_score" integer,
    "macronutrients" jsonb,
    "dietary_tags" text[],
    "avg_rating" double precision default 0,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."menu_events" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "item_id" uuid not null,
    "dining_hall_id" uuid not null,
    "meal" text not null,
    "date" date not null default CURRENT_DATE
      );



  create table "public"."photos" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "item_id" uuid not null,
    "storage_path" text not null,
    "is_approved" boolean default false,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."user_ratings" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "item_id" uuid not null,
    "rating" integer not null,
    "comment" text,
    "created_at" timestamp with time zone default now()
      );


CREATE UNIQUE INDEX dining_halls_name_key ON public.dining_halls USING btree (name);

CREATE UNIQUE INDEX dining_halls_pkey ON public.dining_halls USING btree (id);

CREATE UNIQUE INDEX dining_halls_slug_key ON public.dining_halls USING btree (slug);

CREATE UNIQUE INDEX items_dining_hall_id_name_key ON public.items USING btree (dining_hall_id, name);

CREATE UNIQUE INDEX items_pkey ON public.items USING btree (id);

CREATE UNIQUE INDEX menu_events_item_id_date_meal_key ON public.menu_events USING btree (item_id, date, meal);

CREATE UNIQUE INDEX menu_events_pkey ON public.menu_events USING btree (id);

CREATE UNIQUE INDEX photos_pkey ON public.photos USING btree (id);

CREATE UNIQUE INDEX user_ratings_pkey ON public.user_ratings USING btree (id);

alter table "public"."dining_halls" add constraint "dining_halls_pkey" PRIMARY KEY using index "dining_halls_pkey";

alter table "public"."items" add constraint "items_pkey" PRIMARY KEY using index "items_pkey";

alter table "public"."menu_events" add constraint "menu_events_pkey" PRIMARY KEY using index "menu_events_pkey";

alter table "public"."photos" add constraint "photos_pkey" PRIMARY KEY using index "photos_pkey";

alter table "public"."user_ratings" add constraint "user_ratings_pkey" PRIMARY KEY using index "user_ratings_pkey";

alter table "public"."dining_halls" add constraint "dining_halls_name_key" UNIQUE using index "dining_halls_name_key";

alter table "public"."dining_halls" add constraint "dining_halls_slug_key" UNIQUE using index "dining_halls_slug_key";

alter table "public"."items" add constraint "items_dining_hall_id_fkey" FOREIGN KEY (dining_hall_id) REFERENCES public.dining_halls(id) not valid;

alter table "public"."items" validate constraint "items_dining_hall_id_fkey";

alter table "public"."items" add constraint "items_dining_hall_id_name_key" UNIQUE using index "items_dining_hall_id_name_key";

alter table "public"."menu_events" add constraint "menu_events_dining_hall_id_fkey" FOREIGN KEY (dining_hall_id) REFERENCES public.dining_halls(id) not valid;

alter table "public"."menu_events" validate constraint "menu_events_dining_hall_id_fkey";

alter table "public"."menu_events" add constraint "menu_events_item_id_date_meal_key" UNIQUE using index "menu_events_item_id_date_meal_key";

alter table "public"."menu_events" add constraint "menu_events_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(id) not valid;

alter table "public"."menu_events" validate constraint "menu_events_item_id_fkey";

alter table "public"."menu_events" add constraint "menu_events_meal_check" CHECK ((meal = ANY (ARRAY['Breakfast'::text, 'Brunch'::text, 'Lunch'::text, 'Dinner'::text]))) not valid;

alter table "public"."menu_events" validate constraint "menu_events_meal_check";

alter table "public"."photos" add constraint "photos_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(id) not valid;

alter table "public"."photos" validate constraint "photos_item_id_fkey";

alter table "public"."photos" add constraint "photos_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."photos" validate constraint "photos_user_id_fkey";

alter table "public"."user_ratings" add constraint "user_ratings_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.items(id) not valid;

alter table "public"."user_ratings" validate constraint "user_ratings_item_id_fkey";

alter table "public"."user_ratings" add constraint "user_ratings_rating_check" CHECK (((rating >= 1) AND (rating <= 5))) not valid;

alter table "public"."user_ratings" validate constraint "user_ratings_rating_check";

alter table "public"."user_ratings" add constraint "user_ratings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."user_ratings" validate constraint "user_ratings_user_id_fkey";

grant delete on table "public"."dining_halls" to "anon";

grant insert on table "public"."dining_halls" to "anon";

grant references on table "public"."dining_halls" to "anon";

grant select on table "public"."dining_halls" to "anon";

grant trigger on table "public"."dining_halls" to "anon";

grant truncate on table "public"."dining_halls" to "anon";

grant update on table "public"."dining_halls" to "anon";

grant delete on table "public"."dining_halls" to "authenticated";

grant insert on table "public"."dining_halls" to "authenticated";

grant references on table "public"."dining_halls" to "authenticated";

grant select on table "public"."dining_halls" to "authenticated";

grant trigger on table "public"."dining_halls" to "authenticated";

grant truncate on table "public"."dining_halls" to "authenticated";

grant update on table "public"."dining_halls" to "authenticated";

grant delete on table "public"."dining_halls" to "postgres";

grant insert on table "public"."dining_halls" to "postgres";

grant references on table "public"."dining_halls" to "postgres";

grant select on table "public"."dining_halls" to "postgres";

grant trigger on table "public"."dining_halls" to "postgres";

grant truncate on table "public"."dining_halls" to "postgres";

grant update on table "public"."dining_halls" to "postgres";

grant delete on table "public"."dining_halls" to "service_role";

grant insert on table "public"."dining_halls" to "service_role";

grant references on table "public"."dining_halls" to "service_role";

grant select on table "public"."dining_halls" to "service_role";

grant trigger on table "public"."dining_halls" to "service_role";

grant truncate on table "public"."dining_halls" to "service_role";

grant update on table "public"."dining_halls" to "service_role";

grant delete on table "public"."items" to "anon";

grant insert on table "public"."items" to "anon";

grant references on table "public"."items" to "anon";

grant select on table "public"."items" to "anon";

grant trigger on table "public"."items" to "anon";

grant truncate on table "public"."items" to "anon";

grant update on table "public"."items" to "anon";

grant delete on table "public"."items" to "authenticated";

grant insert on table "public"."items" to "authenticated";

grant references on table "public"."items" to "authenticated";

grant select on table "public"."items" to "authenticated";

grant trigger on table "public"."items" to "authenticated";

grant truncate on table "public"."items" to "authenticated";

grant update on table "public"."items" to "authenticated";

grant delete on table "public"."items" to "postgres";

grant insert on table "public"."items" to "postgres";

grant references on table "public"."items" to "postgres";

grant select on table "public"."items" to "postgres";

grant trigger on table "public"."items" to "postgres";

grant truncate on table "public"."items" to "postgres";

grant update on table "public"."items" to "postgres";

grant delete on table "public"."items" to "service_role";

grant insert on table "public"."items" to "service_role";

grant references on table "public"."items" to "service_role";

grant select on table "public"."items" to "service_role";

grant trigger on table "public"."items" to "service_role";

grant truncate on table "public"."items" to "service_role";

grant update on table "public"."items" to "service_role";

grant delete on table "public"."menu_events" to "anon";

grant insert on table "public"."menu_events" to "anon";

grant references on table "public"."menu_events" to "anon";

grant select on table "public"."menu_events" to "anon";

grant trigger on table "public"."menu_events" to "anon";

grant truncate on table "public"."menu_events" to "anon";

grant update on table "public"."menu_events" to "anon";

grant delete on table "public"."menu_events" to "authenticated";

grant insert on table "public"."menu_events" to "authenticated";

grant references on table "public"."menu_events" to "authenticated";

grant select on table "public"."menu_events" to "authenticated";

grant trigger on table "public"."menu_events" to "authenticated";

grant truncate on table "public"."menu_events" to "authenticated";

grant update on table "public"."menu_events" to "authenticated";

grant delete on table "public"."menu_events" to "postgres";

grant insert on table "public"."menu_events" to "postgres";

grant references on table "public"."menu_events" to "postgres";

grant select on table "public"."menu_events" to "postgres";

grant trigger on table "public"."menu_events" to "postgres";

grant truncate on table "public"."menu_events" to "postgres";

grant update on table "public"."menu_events" to "postgres";

grant delete on table "public"."menu_events" to "service_role";

grant insert on table "public"."menu_events" to "service_role";

grant references on table "public"."menu_events" to "service_role";

grant select on table "public"."menu_events" to "service_role";

grant trigger on table "public"."menu_events" to "service_role";

grant truncate on table "public"."menu_events" to "service_role";

grant update on table "public"."menu_events" to "service_role";

grant delete on table "public"."photos" to "anon";

grant insert on table "public"."photos" to "anon";

grant references on table "public"."photos" to "anon";

grant select on table "public"."photos" to "anon";

grant trigger on table "public"."photos" to "anon";

grant truncate on table "public"."photos" to "anon";

grant update on table "public"."photos" to "anon";

grant delete on table "public"."photos" to "authenticated";

grant insert on table "public"."photos" to "authenticated";

grant references on table "public"."photos" to "authenticated";

grant select on table "public"."photos" to "authenticated";

grant trigger on table "public"."photos" to "authenticated";

grant truncate on table "public"."photos" to "authenticated";

grant update on table "public"."photos" to "authenticated";

grant delete on table "public"."photos" to "postgres";

grant insert on table "public"."photos" to "postgres";

grant references on table "public"."photos" to "postgres";

grant select on table "public"."photos" to "postgres";

grant trigger on table "public"."photos" to "postgres";

grant truncate on table "public"."photos" to "postgres";

grant update on table "public"."photos" to "postgres";

grant delete on table "public"."photos" to "service_role";

grant insert on table "public"."photos" to "service_role";

grant references on table "public"."photos" to "service_role";

grant select on table "public"."photos" to "service_role";

grant trigger on table "public"."photos" to "service_role";

grant truncate on table "public"."photos" to "service_role";

grant update on table "public"."photos" to "service_role";

grant delete on table "public"."user_ratings" to "anon";

grant insert on table "public"."user_ratings" to "anon";

grant references on table "public"."user_ratings" to "anon";

grant select on table "public"."user_ratings" to "anon";

grant trigger on table "public"."user_ratings" to "anon";

grant truncate on table "public"."user_ratings" to "anon";

grant update on table "public"."user_ratings" to "anon";

grant delete on table "public"."user_ratings" to "authenticated";

grant insert on table "public"."user_ratings" to "authenticated";

grant references on table "public"."user_ratings" to "authenticated";

grant select on table "public"."user_ratings" to "authenticated";

grant trigger on table "public"."user_ratings" to "authenticated";

grant truncate on table "public"."user_ratings" to "authenticated";

grant update on table "public"."user_ratings" to "authenticated";

grant delete on table "public"."user_ratings" to "postgres";

grant insert on table "public"."user_ratings" to "postgres";

grant references on table "public"."user_ratings" to "postgres";

grant select on table "public"."user_ratings" to "postgres";

grant trigger on table "public"."user_ratings" to "postgres";

grant truncate on table "public"."user_ratings" to "postgres";

grant update on table "public"."user_ratings" to "postgres";

grant delete on table "public"."user_ratings" to "service_role";

grant insert on table "public"."user_ratings" to "service_role";

grant references on table "public"."user_ratings" to "service_role";

grant select on table "public"."user_ratings" to "service_role";

grant trigger on table "public"."user_ratings" to "service_role";

grant truncate on table "public"."user_ratings" to "service_role";

grant update on table "public"."user_ratings" to "service_role";
