/*
 Espruino module for BMA421/BMA423 motion sensor
 */


//delete the next line for module
//var exports={};

//create an instance - initialise if necessary (or just reconnect)
function BMA421(_i2c) {
  this.i2c = _i2c;
  this.enabled = (this.checkstatus()==1);
  if (!this.enabled) this.initialise();
}


BMA421.prototype.initialise = function() {
//reset sensor
  this.writeReg(0x7E,0xB6); 
//disable power save
  this.writeReg(0x7C,0x00); 
  this.loadConfig();
//Accl Enable
  this.writeReg(0x7D, 0x04);
//Acc Config
  this.writeReg(0x40, 0b00101000);
//Enable and Reset Step Counter - this will also enable power save
  this.resetSteps();
  this.enabled = (this.checkstatus()==1);
}

//x and y are swapped - could remap in hardware
BMA421.prototype.getAccel = function() {
  var acc = { x: 0, y: 0, z: 0 };
  if (this.enabled) {
    var data = new Int16Array(this.readBytes(0x12,6).buffer);
    return {x: data[1]/16, y:data[0]/16, z:data[2]/16};
  }
  else return acc;
}

BMA421.prototype.getSteps = function() {
  if (this.enabled) {
    var steps = this.readBytes(0x1E,4);
    return (steps[3] << 24) + (steps[2] <<16) + (steps[1] << 8) + steps[0];
  }
  else return 0;
}

//Temperature always seems to be 25
BMA421.prototype.getTemp = function() {
    if (this.enabled) {
      return this.readBytes(0x22,1)[0] +23;
  }
  else return -300;
}

//enables the step counter, disables the step detector
BMA421.prototype.resetSteps = function() {
  this.writeReg(0x7C, 0x00);//Sleep disable
  var feature_config = new Uint8Array(70);
  feature_config = this.readFeatures(70);
  feature_config[0x3A + 1] =  0x34; 
  this.writeFeatures(feature_config, 70);
//Sleep Enable
  this.writeReg(0x7C, 0x03);
}

//burst write data to a register    
BMA421.prototype.writeReg = function(r,d) {
    this.i2c.writeTo(0x18,r,d);
}

//read a given number of bytes from a register
BMA421.prototype.readBytes = function(r,l) {
  this.i2c.writeTo(0x18,r);
  return this.i2c.readFrom(0x18,l);
}

//read a single byte from a register
BMA421.prototype.readReg = function(reg) {
    this.i2c.writeTo(0x18,reg);
    return this.i2c.readFrom(0x18,1)[0];
}

//burst read bytes from the feature config
BMA421.prototype.readFeatures = function(l) {
  this.i2c.writeTo(0x18,0x5E);
  return this.i2c.readFrom(0x18,l);
}

//burst write bytes to the feature config
BMA421.prototype.writeFeatures = function(config) {
  this.i2c.writeTo(0x18,0x5E,config);
}

//Config file as a binary blob - write in chunks
BMA421.prototype.loadConfig = function () {
  var buffer_size = 64;
//initialise config
  this.writeReg(0x59,0x00); 
  for (var i=0;i<6144; i+=buffer_size) {
    var config = require("Storage").read("bma421_config.bin",i,buffer_size);
    this.i2c.writeTo(0x18,0x5B,  (i / 2) & 0x0F);
    this.i2c.writeTo(0x18,0x5C, (i / 2) >> 4);
    this.i2c.writeTo(0x18,0x5E,config);
  }
//enable sensor features
  this.writeReg(0x59,0x01); 
}

//LSB of status register is 1 for working
BMA421.prototype.checkstatus = function() {
    return (this.readReg(0x2A) & 0x1F);
}

exports.connect = function(_i2c) {
  return new BMA421(_i2c);
}