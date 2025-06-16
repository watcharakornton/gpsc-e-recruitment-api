const fs = require('fs');
const path = require('path');
const https = require('https');
const axios = require('axios');
const db = require('./db');
const moduleBodies = require('./moduleBodies');
require('dotenv').config();

const cert = fs.readFileSync(path.resolve(__dirname, process.env.CERT_PATH));
const key = fs.readFileSync(path.resolve(__dirname, process.env.KEY_PATH));

const availabelModules = [
    'list >> npm run list',
    'All HPAI002>> npm run hpai002 -- X XXXX',
    'HPAI003 P 0002 >> npm run hpai003',
    'Test connection DB >> npm run db',
    'insert >> npm run insert -- X XXXX',
    'set orgchart >> npm run set_orgchart',
    'get orgchart >> npm run get_orgchart',
    'export orgchart >> npm run export_orgchart'
];

const httpsAgent = new https.Agent({
    cert,
    key,
    rejectUnauthorized: true
});

const moduleConfigs = {
    HPAI002: {
        url: 'https://prd-sg.it-cpi004-rt.cfapps.ap11.hana.ondemand.com/http/getOrganizationStructure',
        body: moduleBodies.HPAI002
    },
    HPAI003: {
        url: 'https://prd-sg.it-cpi004-rt.cfapps.ap11.hana.ondemand.com/http/getEmployeeMasterAllinfotype',
        body: moduleBodies.HPAI003
    },
    DBTEST: {
        test: true //
    },
    insert: {
        test: true
    },
    set_orgchart: {
        sp: 'sp_generate_org_chart'
    },
    get_orgchart: {
        test: true
    },
    export_orgchart: {
        test: true
    }
};

function formatDate(dateStr) {
    if (!dateStr || dateStr === '000000' || dateStr.length !== 8) return null;
    return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6)}`;
}

async function main() {
    const [, , moduleCode, otype, infty] = process.argv;

    if (moduleCode === 'list') {
        console.log('📦 Availabel Modules');
        availabelModules.forEach(m => console.log(`- ${m}`));
        return;
    } else if (!moduleCode || !moduleConfigs[moduleCode]) {
        console.error('❌ กรุณาระบุโมดูลที่ถูกต้อง เช่น: HPAI002, HPAI003, DBTEST, list');
        process.exit(0);
    } else if (moduleCode === 'DBTEST') {
        console.log('🔧 [DBTEST] กำลังทดสอบการเชื่อมต่อฐานข้อมูล...')
        try {
            const conn = await db.getConnection();
            const [rows] = await conn.query('SHOW Tables;');
            console.log('✅ เชื่อมต่อสำเร็จ:', rows);
            conn.release();
            process.exit(0);
        } catch (err) {
            console.error('❌ การเชื่อมต่อ DB ล้มเหลว:', err.message);
        }
        return;
    } else if (moduleCode === 'insert') {
        if (!otype || !infty) {
            console.error('❌ สำหรับ insert กรุณาระบุ IV_OTYPE และ IV_INFTY เช่่น : npm run insert -- O 1000')
            process.exit(0);
        } else if (infty === '1000') {
            const headers = {
                'Content-Type': 'application/json',
                'SystemCode': 'DX',
                'accept': '*/*'
            }

            const body = JSON.parse(JSON.stringify(moduleBodies.HPAI002));
            body.IV_OTYPE = otype;
            body.IV_INFTY = infty;

            try {
                const response = await axios.post(
                    'https://prd-sg.it-cpi004-rt.cfapps.ap11.hana.ondemand.com/http/getOrganizationStructure',
                    body,
                    { headers, httpsAgent }
                );

                const items = response.data.ET_HRP_DATA?.item || [];
                if (!Array.isArray(items) || items.length === 0) {
                    console.warn('⚠️ ไม่มีข้อมูล item')
                    return;
                }

                const connection = await db.getConnection();
                await connection.execute(`TRUNCATE TABLE ${otype}_${infty}`);
                console.log(`🧹 ล้างข้อมูลเก่าใน ${otype}_${infty} แล้ว`);

                let inserted = 0;

                for (const entry of items) {
                    if (!entry.DATA) continue;

                    const fields = entry.DATA.split('|').map(f => f.trim());
                    if (fields.length < 22) continue;

                    const [
                        mandt, plvar, otype, objid, istat,
                        begda, endda, langu, seqnr, otjid,
                        inftyVal, aedtm, uname, reasn, histo,
                        itxnr, short, stext, gdate, mc_short,
                        mc_stext, mc_seark
                    ] = fields;

                    if (!endda.startsWith('9999')) continue;

                    try {
                        await connection.execute(
                            `INSERT INTO ${otype}_${infty}
                        (otype, objid, begda, endda, short, stext)
                        VALUES (?, ?, ?, ?, ?, ?)`,
                            [otype, objid, formatDate(begda), formatDate(endda), short, stext]
                        );
                        inserted++;
                    } catch (err) {
                        console.error(`❌ Insert error objid ${objid}:`, err.message);
                    }
                }

                console.log(`✅ Inserted ${inserted} records to ${otype}_${infty}`);
                connection.release();
                process.exit(0);
            } catch (err) {
                console.error('❌ Fetch/Insert error:', err.response?.data || err.message);
                process.exit(0);
            }
        } else if (infty === '1001') {
            const headers = {
                'Content-Type': 'application/json',
                'SystemCode': 'DX',
                'accept': '*/*'
            }

            const body = JSON.parse(JSON.stringify(moduleBodies.HPAI002));
            body.IV_OTYPE = otype;
            body.IV_INFTY = infty;

            try {
                const response = await axios.post(
                    'https://prd-sg.it-cpi004-rt.cfapps.ap11.hana.ondemand.com/http/getOrganizationStructure',
                    body,
                    { headers, httpsAgent }
                );

                const items = response.data.ET_HRP_DATA?.item || [];
                if (!Array.isArray(items) || items.length === 0) {
                    console.warn('⚠️ ไม่มีข้อมูล item')
                    return;
                }

                const connection = await db.getConnection();
                await connection.execute(`TRUNCATE TABLE ${otype}_${infty}`);
                console.log(`🧹 ล้างข้อมูลเก่าใน ${otype}_${infty} แล้ว`);

                let inserted = 0;

                for (const entry of items) {
                    if (!entry.DATA) continue;

                    const fields = entry.DATA.split('|').map(f => f.trim());
                    if (fields.length < 24) continue;

                    const [
                        mandt, otype, objid, plvar, rsign,
                        relat, istat, priox, begda, endda,
                        varyf, seqnr, infty, otjid, subty,
                        aedtm, uname, reasn, histo, itxnr,
                        sclas, sobid, prozt, adatanr
                    ] = fields;

                    if (!endda.startsWith('9999')) continue;

                    try {
                        await connection.execute(
                            `INSERT INTO ${otype}_${infty}
                        (otype, objid, rsign, relat, begda, endda, sclas, sobid)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                            [otype, objid, rsign, relat, formatDate(begda), formatDate(endda), sclas, sobid]
                        );
                        inserted++;
                    } catch (err) {
                        console.error(`❌ Insert error objid ${objid}:`, err.message);
                    }
                }

                console.log(`✅ Inserted ${inserted} records to ${otype}_${infty}`);
                connection.release();
                process.exit(0);
            } catch (err) {
                console.error('❌ Fetch/Insert error:', err.response?.data || err.message);
                process.exit(0);
            }
        } else if (otype === 'O' && infty === '1010') {
            const headers = {
                'Content-Type': 'application/json',
                'SystemCode': 'DX',
                'accept': '*/*'
            }

            const body = JSON.parse(JSON.stringify(moduleBodies.HPAI002));
            body.IV_OTYPE = otype;
            body.IV_INFTY = infty;

            try {
                const response = await axios.post(
                    'https://prd-sg.it-cpi004-rt.cfapps.ap11.hana.ondemand.com/http/getOrganizationStructure',
                    body,
                    { headers, httpsAgent }
                );

                const items = response.data.ET_HRP_DATA?.item || [];
                if (!Array.isArray(items) || items.length === 0) {
                    console.warn('⚠️ ไม่มีข้อมูล item')
                    return;
                }

                const connection = await db.getConnection();
                await connection.execute(`TRUNCATE TABLE ${otype}_${infty}`);
                console.log(`🧹 ล้างข้อมูลเก่าใน ${otype}_${infty} แล้ว`);

                let inserted = 0;

                for (const entry of items) {
                    if (!entry.DATA) continue;

                    const fields = entry.DATA.split('|').map(f => f.trim());
                    if (fields.length < 18) continue;

                    const [
                        mandt, plvar, otype, objid, subty,
                        istat, begda, endda, varyf, seqnr,
                        infty, otjid, aedtm, uname, reasn,
                        histo, itxnr, hilfm,
                    ] = fields;

                    if (!endda.startsWith('9999')) continue;

                    try {
                        await connection.execute(
                            `INSERT INTO ${otype}_${infty}
                        (otype, objid, begda, endda, hilfm)
                        VALUES (?, ?, ?, ?, ?)`,
                            [otype, objid, formatDate(begda), formatDate(endda), hilfm]
                        );
                        inserted++;
                    } catch (err) {
                        console.error(`❌ Insert error objid ${objid}:`, err.message);
                    }
                }

                console.log(`✅ Inserted ${inserted} records to ${otype}_${infty}`);
                connection.release();
                process.exit(0);
            } catch (err) {
                console.error('❌ Fetch/Insert error:', err.response?.data || err.message);
                process.exit(0);
            }
        } else if (otype === 'P' && infty === '0002') {
            const headers = {
                'Content-Type': 'application/json',
                'SystemCode': 'DX',
                'accept': '*/*'
            }

            const body = JSON.parse(JSON.stringify(moduleBodies.HPAI003));
            body.IV_INFTY = infty;

            try {
                const response = await axios.post(
                    'https://prd-sg.it-cpi004-rt.cfapps.ap11.hana.ondemand.com/http/getEmployeeMasterAllinfotype',
                    body,
                    { headers, httpsAgent }
                );

                const items = response.data.ET_INFTY_DATA?.item || [];
                if (!Array.isArray(items) || items.length === 0) {
                    console.warn('⚠️ ไม่มีข้อมูล item')
                    return;
                }

                const connection = await db.getConnection();
                await connection.execute(`TRUNCATE TABLE ${otype}_${infty}`);
                console.log(`🧹 ล้างข้อมูลเก่าใน ${otype}_${infty} แล้ว`);

                let inserted = 0;

                for (const entry of items) {
                    if (!entry.DATA) continue;

                    const fields = entry.DATA.split('|').map(f => f.trim());
                    if (fields.length < 71) continue;

                    const [
                        pernr, infty, subty, objps, sprps,
                        endda, begda, seqnr, aedtm, uname,
                        histo, itxex, refex, ordex, itbld,
                        preas, flag1, flag2, flag3, flag4,
                        rese1, rese2, grpvl, inits, nachn,
                        name2, nach2, vorna, cname, titel,
                        titl2, namzu, vorsw, vors2, rufnm,
                        midnm, knznm, anred, gesch, gbdat,
                        gblnd, gbdep, gbort, natio, nati2,
                        nati3, sprsl, konfe, famst, famdt,
                        anzkd, nacon, permo, perid, gbpas,
                        fnamk, lnamk, fnamr, lnamr, nabik,
                        nabir, nickk, nickr, gpjhr, gbmon,
                        gbtag, nchmc, vnamc, namz2, gender_si,
                    ] = fields;

                    if (!endda.startsWith('9999')) continue;

                    try {
                        await connection.execute(
                            `INSERT INTO ${otype}_${infty}
                        (pernr, begda, endda, titel, vorna, nachn, natio)
                        VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [pernr, formatDate(begda), formatDate(endda), titel, vorna, nachn, natio]
                        );
                        inserted++;
                    } catch (err) {
                        console.error(`❌ Insert error pernr ${pernr}:`, err.message);
                    }
                }

                console.log(`✅ Inserted ${inserted} records to ${otype}_${infty}`);
                connection.release();
                process.exit(0);
            } catch (err) {
                console.error('❌ Fetch/Insert error:', err.response?.data || err.message);
                process.exit(0);
            }
        } else {
            console.log(`xxx`);
        }

    } else if (moduleCode === 'set_orgchart') {
        const spName = moduleConfigs[moduleCode].sp;
        if (!spName) {
            console.error('❌ ไม่พบชื่อ Stored Procedure');
            process.exit(0);
        }

        console.log(`📦 [${moduleCode}] กำลังเรียกใช้ Stored Procedure: ${spName}`);
        try {
            const conn = await db.getConnection();
            await conn.query(`CALL ${spName}();`);
            console.log(`✅ เรียกใช้ Stored Procedure ${spName} สำเร็จ`);
            conn.release();
            process.exit(0);
        } catch (err) {
            console.error(`❌ เรียกใช้ Stored Procedure ผิดพลาด:`, err.message);
            process.exit(0);
        }
    } else if (moduleCode === 'get_orgchart') {
        try {
            const conn = await db.getConnection();
            const [rows] = await conn.query(`SELECT * FROM org_chart ORDER BY dropdown_type LIMIT 100;`);
            console.log('✅ ข้อมูลใน org_chart:');
            console.log(rows);
            conn.release();
            process.exit(0);
        } catch (err) {
            console.error(`❌ เรียกใช้ผิดพลาด:`, err.message);
            process.exit(0);
        }
    } else if (moduleCode === 'export_orgchart') {
        try {
            const conn = await db.getConnection();
            const [rows] = await conn.query(`SELECT * FROM org_chart`);
            conn.release();

            const result = {
                field: [],
                department: [],
                division: [],
                position: []
            };

            rows.forEach(entry => {
                const formatted = {
                    key: entry.key,
                    value: entry.value
                };

                if (entry.dropdown_type === 'FIELD') {
                    result.field.push(formatted);
                } else if (entry.dropdown_type === 'DEPARTMENT') {
                    result.department.push({ ...formatted, parent_key: entry.parent_key });
                } else if (entry.dropdown_type === 'DIVISION') {
                    result.division.push({ ...formatted, parent_key: entry.parent_key });
                } else if (entry.dropdown_type === 'POSITION') {
                    result.position.push({ ...formatted, parent_key: entry.parent_key });
                }
            });
            
            const outputDir = path.join(__dirname, 'results');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir);
            }

            const outputPath = path.join(outputDir, 'positions_v17.json');
            fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf8');
            console.log('✅ บันทึกข้อมูล positions_v17.json สำเร็จ');
            process.exit(0);
        } catch (err) {
            console.error(`❌ export_orgchart error:`, err.message);
            process.exit(0);
        }
    } else {
        const config = moduleConfigs[moduleCode];

        const body = config.baseBody
            ? JSON.parse(JSON.stringify(config.baseBody))
            : JSON.parse(JSON.stringify(config.body));

        if (moduleCode === 'HPAI002') {
            if (!otype || !infty) {
                console.error('❌ สำหรับ HPAI002 กรุณาระบุ IV_OTYPE และ IV_INFTY เช่น: node fetchInterface.js HPAI002 O 1000');
                process.exit(0);
            }

            body.IV_OTYPE = otype;
            body.IV_INFTY = infty;
        }

        const headers = {
            'Content-Type': 'application/json',
            'SystemCode': 'DX',
            'accept': '*/*'
        };

        try {
            const response = await axios.post(config.url, body, { headers, httpsAgent });

            const items = response.data.ET_HRP_DATA?.item ?? response.data.ET_INFTY_DATA?.item;

            if (!items || items.length === 0) {
                console.log('ℹ️ ไม่มีข้อมูลที่ดึงได้');
                return;
            }

            console.log(`✅ [${moduleCode}] ดึงข้อมูลสำเร็จ: ${items.length} แถว`);
            items.forEach((entry, index) => {
                console.log(`${entry.DATA}`);
            });
            // console.log(items);

        } catch (error) {
            console.error(`❌ [${moduleCode}] เกิดข้อผิดพลาด:`, error.message);
        }
    }
}

main();
