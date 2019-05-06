
## Run postgis container using a volume to persist data

`docker run --name paintthetown-postgis -e POSTGRES_PASSWORD=password -d -p 5432:5432 -v $HOME/docker/volumes/postgres:/var/lib/postgresql/data mdillon/postgis`

## Load MapPLUTO

shp2pgsql -s 2263:3857 MapPLUTO public.mappluto | psql -h localhost -d postgres -U postgres

## Add gist index to geoms

CREATE INDEX mappluto_geom_idx
  ON mappluto
  USING GIST (geom);
