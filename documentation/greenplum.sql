-- client maintenance
select * from ardm_085.config_control;
update ardm_085.config_control set 
error='appriss_snowflake 10 20240214_095357',
recover_flg = '1'
, status = 'ERRORED'
where configuration_id = 'ardm'
;
-- summary of control records
DO $$
DECLARE
    rec RECORD;
    cnt integer := 0;
    sql_to_run text := 'drop table if exists work_ld.list_control_all; create table work_ld.list_control_all as ';
    ctrl_tbl text := 'config_control';
BEGIN
  FOR rec IN
            SELECT *
            FROM information_schema.tables
            WHERE  table_name = ctrl_tbl
--            and table_schema like 'ardm%'
            and length(table_schema) = 8
            ORDER BY table_schema
        loop
	        cnt := cnt + 1;
	        if cnt > 1 then
	          sql_to_run := sql_to_run || '
 UNION 
';
	        end if;
	        sql_to_run := sql_to_run || 'select '''|| rec.table_schema || ''', * from '|| rec.table_schema || '.' || rec.table_name;
        END LOOP;
  sql_to_run := sql_to_run || '
 distributed by (client_id)';
--  RAISE NOTICE '%',sql_to_run;            
  EXECUTE sql_to_run;
END $$;
select * from work_ld.list_control_all where status_update_timestamp > '2/11/2024' 
--and process not like '%.sas%'
order by status;
-- check schema/table size and record number
select table_schema, table_name
, pg_size_pretty (pg_total_relation_size (table_schema||'.'||table_name))
--, 'delete from '||table_name||' where inserteddatetime>''2020-01-16 09:00:00'';'
--, 'delete from '||table_name||' where transactionid=1908060688035365500;'
--, 'alter table '||table_name||' rename to '||replace(table_name,'ardm_','trk_')||';'
--, 'truncate table '||table_schema||'.'||table_name||';'
--, 'insert into '||table_name||'_update select * from '||table_name||' where inserteddatetime>''2020-01-14 10:40:50'';'
--, 'delete from '||table_name||' where inserteddatetime<''2019-11-26 13:54:10'';'
  , translate(xpath('/row/cnt/text()'
                    , query_to_xml('select count(*) as cnt from '||table_schema||'.'||table_name, false, true, '')
                    )::text,'{}','') as rownum
--  , translate(xpath('/row/cnt/text()'
--                    , query_to_xml('select count(distinct filename) as cnt from '||table_schema||'.'||table_name, false, true, '')
--                    )::text,'{}','') as filenum
--, 'insert into '||table_schema||'.'||table_name||' select * from '||table_schema||'.'||replace(table_name,'_update', '')
--  ||' where inserteddatetime > ''2021-06-27 10:28:55'' and inserteddatetime < ''2021-06-27 10:48:50'';'
  from information_schema.tables
--  where table_schema = 'ardm_095' --<< change here for the schema you want
--  and table_name like '%_update'
  where table_schema = 'ardm_064' --<< change here for the schema you want
  and table_name like 'ardm_%'--'pempty_ret%'
  and table_name not like 'ardm_%_stg' and table_name not like 'ardm_%_update' and table_name not like 'ardm_%_backup' and table_name not like 'ardm_%_log'
order by table_name;
-- partition table drop partition
alter table ardm_034.ardm_header drop partition t2024_04;
SELECT 
    schema_name,
    pg_size_pretty(sum(pg_total_relation_size(schema_name || '.' || table_name))) AS total_size
FROM 
    information_schema.tables
WHERE 
    table_schema = 'your_schema_name'
GROUP BY 
    schema_name;
-- PL/SQL loop through array
DO $$
DECLARE
    arr INT[] := ARRAY[10, 20, 30, 40, 50]; -- Define an array
    elem INT; -- Variable to hold each element
BEGIN
    FOREACH elem IN ARRAY arr LOOP
        RAISE NOTICE 'Element: %', elem; -- Print each element
    END LOOP;
END $$;
DO $$
DECLARE
    arr TEXT[] := ARRAY['apple', 'banana', 'cherry']; -- Define an array
    i INT; -- Index variable
BEGIN
    FOR i IN 1 .. array_length(arr, 1) LOOP
        RAISE NOTICE 'Element %: %', i, arr[i]; -- Print each element with its index
    END LOOP;
END $$;
-- collect view information
select 
  view_schema as schema_name,
  view_name,
  table_schema as referenced_table_schema,
  table_name as referenced_table_name
from information_schema.view_table_usage
where table_schema not in ('information_schema', 'pg_catalog')
and view_schema = 'ardm_095'     -- change to your interested schema name
-- and table_name = 'ardm_customer' -- change to your interested table name
and table_name like 'ardm_%' and table_name not like 'ardm_%_stg' and table_name not like 'ardm_%_update'
order by view_schema, view_name
;
-- copy result to FILE

-- I like to get records from all schemas under Greenplum from table config_control table with client_id and process column.
BEGIN;

CREATE TEMP TABLE temp_results (
    table_schema TEXT,
    client_id TEXT,
    process TEXT
) ON COMMIT DROP;

DO $$
DECLARE
    schema_rec RECORD;
    result_rec RECORD;
BEGIN
    FOR schema_rec IN 
        SELECT table_schema 
        FROM information_schema.tables 
        WHERE table_name = 'config_control' 
        ORDER BY table_schema
    LOOP
        FOR result_rec IN EXECUTE format(
            'SELECT client_id, process FROM %I.config_control WHERE configuration_id = ''ardm''',
            schema_rec.table_schema
        ) LOOP
            INSERT INTO temp_results VALUES (schema_rec.table_schema, result_rec.client_id, result_rec.process);
        END LOOP;
    END LOOP;
END $$;

SELECT * FROM temp_results ORDER BY table_schema;

COMMIT; -- temp_results automatically dropped here