let nodes7 = require("nodes7"); // This is the package name, if the repository is cloned you may need to require 'nodeS7' with uppercase S
let conn = new nodes7();
let doneReading = false;

let variables = {
  machineNo: "DB1,C0.10",
  lotNo: "DB1,C10.10",
  downTimeType: "DB1,INT20",
  cycleTime: "DB1,REAL22",
  stateStatus: "DB1,X26.0",
  machineOn: "DB1,X26.1",
  productOk: "DB1,X26.2",
  modelNo: "DB1,C28.10",
};

conn.initiateConnection(
  {
    port: 102,
    host: "192.168.0.1",
    rack: 0,
    slot: 1,
    debug: false,
    timeout: 5000,
  },
  connected
); // slot 2 for 300/400, slot 1 for 1200/1500, change debug to true to get more info
// conn.initiateConnection({port: 102, host: '192.168.0.2', localTSAP: 0x0100, remoteTSAP: 0x0200, timeout: 8000, doNotOptimize: true}, connected);
// local and remote TSAP can also be directly specified instead. The timeout option specifies the TCP timeout.

function connected(err) {
  if (typeof err !== "undefined") {
    // We have an error. Maybe the PLC is not reachable.
    console.log(err);
    process.exit();
  }
  conn.setTranslationCB(function (tag) {
    return variables[tag];
  });
  conn.addItems("machineNo");
  conn.addItems("lotNo");
  conn.addItems("downTimeType");
  conn.addItems("cycleTime");
  conn.addItems("stateStatus");
  conn.addItems("machineOn");
  conn.addItems("productOk");
  console.log("Init connection done");
  setInterval(() => {
    conn.readAllItems(valuesReady);
  }, 100);
}

let prodTemp = 0;
let confirmSignal = false;
let machineOn
let stateStatus
let machineNo
let lotNo
let modelNo
let target
let cycleTime
let prodTotal
let prodPassed
let prodFailed
let downTimeType
let oeeIndicator
let availableIndicator
let performanceIndicator
let qualityIndicator
function regex(str) {
  return str.replace(/[ ]/g,'')
}

function valuesReady(err, values) {
  if (err) {
    console.log("SOMETHING WENT WRONG READING VALUES!!!!");
  }
  // console.log(values)
  doneReading = true;
  if (doneReading) {
  // counting product
    if (values.productOk == false) {
      confirmSignal = true;
    }
    if (values.productOk && confirmSignal) {
      prodTemp++;
      confirmSignal = false;
    }
  // define data from PLC to PC
    machineOn = values.machineOn;
    stateStatus = values.stateStatus;
    machineNo = "LATHE";
    lotNo = regex(values.lotNo);
    modelNo = regex(values.machineNo);
    cycleTime = values.cycleTime;
    downTimeType = values.downTimeType;  
  }
}

initData = () => {
  let present = new Date();
  let year = present.getFullYear();
  let month = present.getMonth() + 1;
  let day = present.getDate();
  let hour = present.getHours();
  let minute = present.getMinutes();

  if (month < 10 || month == 0) {
    month = `0${month}`;
  } else {
    month = month;
  }

  if (day < 10 || day == 0) {
    day = `0${day}`;
  } else {
    day = day;
  }
  if (hour < 10 || hour == 0) {
    hour = `0${hour}`;
  } else {
    hour = hour;
  }

  if (minute < 10 || minute == 0) {
    minute = `0${minute}`;
  } else {
    minute = minute;
  }

  let dateCreated = `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
  target = 0;
  prodTotal = prodTemp;
  prodPassed = prodTemp;
  prodFailed = 0;
  // oeeIndicator = 0;
  // availableIndicator = 0;
  // performanceIndicator = 0;
  // qualityIndicator = 0;

  //___calculating OEE___\\
  //A
  if (stateStatus == true) {
    availableIndicator = 1;
  } else {
    availableIndicator = 0;
  }
  //P
  performanceIndicator = (cycleTime * prodTemp) / 60;
  //Q
  if (prodTemp > 0) {
    qualityIndicator = 1;
  } else {
    qualityIndicator = 0;
  }
  //OEE
  oeeIndicator = availableIndicator * performanceIndicator * qualityIndicator;

  return (
    prodTemp,
    (testData = {
      machineNo: machineNo,
      lotNo: lotNo,
      modelNo: modelNo,
      target: target,
      cycleTime: cycleTime,
      prodTotal: prodTotal,
      prodPassed: prodPassed,
      prodFailed: prodFailed,
      downTimeType: downTimeType,
      stateStatus: stateStatus,
      machineOn: machineOn,
      oeeIndicator: oeeIndicator,
      availableIndicator: availableIndicator,
      performanceIndicator: performanceIndicator,
      qualityIndicator: qualityIndicator,
      year: String(year),
      month: String(month),
      day: String(day),
      hour: String(hour),
      minute: String(minute),
      dateCreated: String(dateCreated),
    })
  );
};
setInterval(() => {
  initData();
  console.log(testData);
  prodTemp = 0;
  testData.machineOn = false;
  testData.stateStatust = false;
  testData.machineNo = "0";
  testData.lotNo = "0";
  testData.modelNo = "0";
  testData.target = 0;
  testData.cycleTime = 0;
  testData.prodTemp = prodTemp;
  testData.prodTotal = prodTemp;
  testData.prodPassed = prodTemp;
  testData.prodFailed = 0;
  testData.downTimeType = 0;
  testData.oeeIndicator = 0;
  testData.availableIndicator = 0;
  testData.performanceIndicator = 0;
  testData.qualityIndicator = 0;
}, 60000);
