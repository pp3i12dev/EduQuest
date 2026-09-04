/*Dentro de backend, crear el archivo .env y pegarle las variables de este archivo*/
/*Sin estas variables, no se conecta a la base de datos postgres neon*/

DATABASE_URL="postgresql://neondb_owner:npg_8ToGQxnSPBO6@ep-spring-sky-acbknm3y-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://neondb_owner:npg_8ToGQxnSPBO6@ep-spring-sky-acbknm3y.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

PORT=3000
JWT_SECRET=estaesmipalabrasecreta