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
    'DBTEST >> npm run db'
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
    }
};

async function main() {
    const [, , moduleCode, otype, infty] = process.argv;

    if (moduleCode === 'list') {
        console.log('📦 Availabel Modules');
        availabelModules.forEach(m => console.log(`- ${m}`));
        return;
    } else if (!moduleCode || !moduleConfigs[moduleCode]) {
        console.error('❌ กรุณาระบุโมดูลที่ถูกต้อง เช่น: HPAI002, HPAI003, DBTEST, list');
        process.exit(1);
    } else if (moduleCode === 'DBTEST') {
        console.log('🔧 [DBTEST] กำลังทดสอบการเชื่อมต่อฐานข้อมูล...')
        try {
            const conn = await db.getConnection();
            const [rows] = await conn.query('SHOW Tables;');
            console.log('✅ เชื่อมต่อสำเร็จ:', rows);
            conn.release();
            process.exit(1);
        } catch (err) {
            console.error('❌ การเชื่อมต่อ DB ล้มเหลว:', err.message);
        }
        return;
    } else {
        const config = moduleConfigs[moduleCode];

        const body = config.baseBody
            ? JSON.parse(JSON.stringify(config.baseBody))
            : JSON.parse(JSON.stringify(config.body));

        if (moduleCode === 'HPAI002') {
            if (!otype || !infty) {
                console.error('❌ สำหรับ HPAI002 กรุณาระบุ IV_OTYPE และ IV_INFTY เช่น: node fetchInterface.js HPAI002 O 1000');
                process.exit(1);
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
            // items.forEach((entry, index) => {
            //     console.log(`${entry.DATA}`);
            // });
            console.log(items);

        } catch (error) {
            console.error(`❌ [${moduleCode}] เกิดข้อผิดพลาด:`, error.message);
        }
    }
}

main();
