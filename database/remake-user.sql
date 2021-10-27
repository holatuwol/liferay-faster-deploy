alter session set "_oracle_script"=true;

select 'alter system kill session '''||sid||','||serial#||''' immediate;' from v$session where username='LPORTAL';

DROP USER lportal cascade;

CREATE USER lportal IDENTIFIED BY lportal DEFAULT TABLESPACE lportal;
GRANT create session, resource, unlimited tablespace TO lportal;

create or replace directory export_lportal as '/home/oracle/backup';
grant read, write on directory export_lportal to lportal;
grant imp_full_database to lportal;
commit;

exit