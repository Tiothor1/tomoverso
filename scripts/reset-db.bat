@echo off
cd /d D:\Site-LN
node -e "const D=new(require('better-sqlite3'))('data/tomoverso.seed.db');const ch=D.prepare('DELETE FROM chapters').run();const n=D.prepare('DELETE FROM novels').run();D.pragma('wal_checkpoint(TRUNCATE)');D.close();console.log('OK caps='+ch.changes+' novels='+n.changes);"
pause