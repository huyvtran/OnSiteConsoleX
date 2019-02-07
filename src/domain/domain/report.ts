/**
 * Name: Report domain class
 * Vers: 7.5.1
 * Date: 2019-01-29
 * Auth: David Sargeant
 * Logs: 7.5.1 2019-01-29: Removed Shift and PayrollPeriod imports; added static methods getPayrollPeriodDate(), getPayrollSerial(), getShiftNumber(), getShiftWeek(), getShiftSerial()
 * Logs: 7.4.1 2018-12-13: refactored imports; added standard OnSite methods
 * Logs: 7.3.3 2018-12-04: Added isTest property
 * Logs: 7.3.2 2018-08-08: Added premium_eligible property, isPremiumEligible() and setPremiumStatus() methods
 * Logs: 7.3.1 2018-08-01: Trying some new stuff for clone, and adding Symbol.toStringTag for typeof checking
 * Logs: 7.2.2 2018-08-01: Added check for matchesSite() being called with Jobsite object
 * Logs: 7.2.1 2018-07-09: Added addStatusUpdate() and setInvoiced() methods, plus StatusUpdateType and ReportStatusLogEntry types
 * Logs: 7.1.1 2018-03-01: Imported Duration type, added methods getStartTimeAsExcel(), getEndTimeAsExcel(), and getReportDateAsExcel()
 * Logs: 7.0.1 2018-02-26: Adjusted report date functions and added getReportDateAsString() method
 * Logs: 6.6.3 2018-02-08: Fixed moment format() bug in serialize() method
 * Logs: 6.6.1 2018-02-08: Added moment encoding for timestampM field, and crew_number to serialize/deserialize
 * Logs: 6.5.4 2018-01-21: Changed flagging to flagged and flagged_fields fields, plus flags(), getFlagNumber(), isFlagged(), isFieldFlagged(), setFlag(), unsetFlag(), clearFlags() methods
 * Logs: 6.5.3 2018-01-20: Added flagged_field and flagged_reason fields, and setFlag method
 * Logs: 6.5.2 2018-01-18: Added crew_number field
 * Logs: 6.5.1 2017-12-15: Added flagged field, invoiced field, and invoices array
 * Logs: 6.4.2 2017-11-14: Fixed it so Excel dates in string format will also read in
 * Logs: 6.4.1 2017-11-12: Added ability to read report_date from rprtDate as an Excel date integer
 * Logs: 6.3.1: Added split_count and split_from
 */
import { sprintf    } from 'sprintf-js'              ;
import { Log        } from '../config/config.log'    ;
import { Moment     } from '../config/moment-onsite' ;
import { moment     } from '../config/moment-onsite' ;
import { isMoment   } from '../config/moment-onsite' ;
import { Duration   } from '../config/moment-onsite' ;
import { isDuration } from '../config/moment-onsite' ;
import { ReportFlag } from '../config/config.types'  ;
import { Employee   } from './employee'              ;
import { Jobsite    } from './jobsite'               ;

type StatusUpdateType = "created" | "updated" | "invoiced" | "paid";
type ReportStatusLogEntry = {
  type       : StatusUpdateType ,
  user       : string           ,
  timestamp  : string           ,
  invoice   ?: number           ,
};

export class Report {
  public _id              : string = "";
  public _rev             : string = "";
  public time_start       : Moment ;
  public time_end         : Moment ;
  public repair_hours     : number = 0;
  public unit_number      : string = "";
  public work_order_number: string = "";
  public crew_number      : string = "";
  public notes            : string = "";
  public report_date      : string = "";
  public last_name        : string = "";
  public first_name       : string = "";
  public shift            : string = "";
  public client           : string = "";
  public location         : string = "";
  public location_id      : string = "";
  public site_number      : number = -1001;
  public shift_time       : Moment ;
  public shift_length     : number = 0;
  public shift_start_time : Moment ;
  public technician       : string = "";
  public timestamp        : number = 0;
  public timestampM       : Moment ;
  public username         : string = "";
  public shift_serial     : string = "";
  public workSite         : string = "";
  public payroll_period   : number = 0;
  public change_log       : ReportStatusLogEntry[] = [];
  public split_count      : number = 0;
  public split_from       : string = "";
  public flagged          : boolean = false;
  public flagged_fields   : ReportFlag[] = [];
  public preauthed        : boolean = false;
  public preauth_dates    : any[] = [];
  public invoiced         : boolean = false;
  public invoiced_date    : string  = "";
  public invoiced_dates   : string[] = [];
  public invoice_numbers  : any[] = [];
  public paid             : boolean = false;
  public paid_date        : string  = "";
  public premium_eligible : boolean = true;
  public isTest           : boolean = false;

  /**
   * Create a Report object. All parameters are optional, and can be populated later from a serialized object document from database.
   * @param {*} [start] Start time for report. Should be a moment.js object. (Optional)
   * @param {*} [end] End time for report. Should be a moment.js object; will be calculated automatically most times. (Optional)
   * @param {*} [hours] Repair hours for report. Should be a number or a moment.js duration object. (Optional)
   * @param {*} [unit] Unit number for report. String. (Optional)
   * @param {*} [wo] Work Order number for report. String. (Optional)
   * @param {*} [nts] Notes for report. String. (optional)
   * @param {*} [date] Date work was performed. Should be a moment.js object or an ISO8601 string. (Optional)
   * @param {*} [last] Technician's last name. String. (Optional)
   * @param {*} [first] Technician's first name. String. (Optional)
   * @param {*} [shift] Shift type for this report (AM/PM). String. (Optional)
   * @param {*} [client] Client work was performed for. String or client name object. (Optional)
   * @param {*} [loc] Location of work site. Usually a city name. String. (Optional)
   * @param {*} [locid] Location ID of work site. MNSHOP, PMPSHP, E-TECH, etc. String. (Optional)
   * @param {*} [loc2] Auxiliary Location of work site. North, South, or NA. String. (Optional)
   * @param {*} [shiftTime] Shift type for this report (AM/PM). String. (Optional)
   * @param {*} [shiftLength] Shift length (in hours) for shift this work was peformed during. Number. (Optional)
   * @param {*} [shiftStartTime] Start time for shift this work was performed during. Number. (Optional)
   * @param {*} [tech] Full name of technician (lastname, firstname). String. (Optional)
   * @param {*} [timestamp] Time stamp representing when report was created. Unix epoch time or Excel datetime format. Number. (Optional)
   * @param {*} [user] Username of technician. String. (Optional)
   * @param {*} [serial] Serial number for shift. Excel date, plus underscore, plus shift sequence number. String. (Optional)
   * @param {*} [payroll] Payroll period number for shift. Excel date of day payroll period started (Wednesday). Number. (Optional)
   *
   * @memberof Report
   */
  constructor(start?:any, end?: any, hours?: any, unit?: any, wo?: any, nts?: any, date?: any, last?: any, first?: any, shift?: any, client?: any, loc?: any, locid?: any, loc2?: any, shiftTime?: any, shiftLength?: any, shiftStartTime?: any, tech?: any, timestamp?: any, user?: any, serial?:any, payroll?:any) {
    if(arguments.length === 1) {
      let doc = arguments[0];
      this.site_number = 0;
      this.invoiced = false;
      this.invoiced_dates = [] ;
      this.readFromDoc(doc);
    } else {
      this._id               = ""                                      ;
      this._rev              = ""                                      ;
      this.time_start        = start || this.time_start                ;
      this.time_end          = end   || this.time_end                  ;
      this.repair_hours      = hours || this.repair_hours              ;
      this.unit_number       = unit  || this.unit_number               ;
      this.work_order_number = wo    || this.work_order_number         ;
      this.crew_number       = ""                                      ;
      this.notes             = nts   || this.notes                     ;
      this.report_date       = date  || this.report_date               ;
      this.last_name         = last  || this.last_name                 ;
      this.first_name        = first || this.first_name                ;
      this.shift             = shift || this.shift                     ;
      this.client            = client|| this.client                    ;
      this.location          = loc   || this.location                  ;
      this.location_id       = locid || "MNSHOP"                       ;
      this.shift_serial      = ""                                      ;
      this.shift_time        = shiftTime      || this.shift_time       ;
      this.shift_length      = shiftLength    || this.shift_length     ;
      this.shift_start_time  = shiftStartTime || this.shift_start_time ;
      this.technician        = tech           || this.technician       ;
      this.timestamp         = timestamp      || this.timestamp        ;
      this.username          = user           || this.username         ;
      this.shift_serial      = ""                                      ;
      this.workSite          = ""                                      ;
      this.payroll_period    = 0                                       ;
      this.site_number       = -1001                                   ;
      this.invoiced          = false                                   ;
      this.invoiced_dates    = []                                      ;
      this.change_log        = []                                      ;
      this.split_count       = 0                                       ;
      this.split_from        = ""                                      ;
      this.flagged           = false                                   ;
      this.flagged_fields    = []                                      ;
      this.preauthed         = false                                   ;
      this.preauth_dates     = []                                      ;
      this.invoiced          = false                                   ;
      this.invoiced_dates    = []                                      ;
      this.invoice_numbers   = []                                      ;
    }
  }

  public readFromDoc(doc:any):Report {
    let fields = [
      ["_id"             , "_id"               ] ,
      ["_rev"            , "_rev"              ] ,
      ["repairHrs"       , "repair_hours"      ] ,
      ["uNum"            , "unit_number"       ] ,
      ["wONum"           , "work_order_number" ] ,
      ["notes"           , "notes"             ] ,
      ["rprtDate"        , "report_date"       ] ,
      ["lastName"        , "last_name"         ] ,
      ["firstName"       , "first_name"        ] ,
      ["client"          , "client"            ] ,
      ["location"        , "location"          ] ,
      ["locID"           , "location_id"       ] ,
      ["shift"           , "shift_time"        ] ,
      ["shiftLength"     , "shift_length"      ] ,
      ["shiftStartTime"  , "shift_start_time"  ] ,
      ["shiftSerial"     , "shift_serial"      ] ,
      ["workSite"        , "workSite"          ] ,
      ["payrollPeriod"   , "payroll_period"    ] ,
      ["technician"      , "technician"        ] ,
      ["timeStamp"       , "timestamp"         ] ,
      ["timeStampM"      , "timestampM"        ] ,
      ["username"        , "username"          ] ,
      ["site_number"     , "site_number"       ] ,
      ["invoiced"        , "invoiced"          ] ,
      ["invoiced_dates"  , "invoiced_dates"    ] ,
      ["change_log"      , "change_log"        ] ,
      ["flagged"         , "flagged"           ] ,
      ["flagged_fields"  , "flagged_fields"    ] ,
      ["preauthed"       , "preauthed"         ] ,
      ["preauth_dates"   , "preauth_dates"     ] ,
      ["invoiced"        , "invoiced"          ] ,
      ["invoiced_date"   , "invoiced_date"     ] ,
      ["invoiced_dates"  , "invoiced_dates"    ] ,
      ["invoice_numbers" , "invoice_numbers"   ] ,
      ["crew_number"     , "crew_number"       ] ,
      ["paid"            , "paid"              ] ,
      ["paid_date"       , "paid_date"         ] ,
    ];
      // try {
      let len = fields.length;
      for(let i = 0; i < len; i++) {
        let docKey = fields[i][0];
        let thisKey = fields[i][1];
        // this[thisKey] = doc[docKey];
        if(thisKey === 'report_date') {
          // this[thisKey] = moment(doc[docKey], "YYYY-MM-DD");
          if(typeof doc[docKey] === 'number') {
            this[thisKey] = moment().fromExcel(doc[docKey]).format("YYYY-MM-DD");
          } else if(typeof doc[docKey] === 'string') {
            let xl = Number(doc[docKey]);
            if(!isNaN(xl)) {
              this[thisKey] = moment().fromExcel(xl).format("YYYY-MM-DD")
            } else {
              this[thisKey] = doc[docKey] ? doc[docKey] : this[thisKey];
            }
          }
        } else {
          this[thisKey] = doc[docKey] ? doc[docKey] : this[thisKey];
        }
      }
      if(!this.technician) {
        this.technician = this.last_name + ", " + this.first_name;
      }

      let report_date = moment(this.report_date, "YYYY-MM-DD");

      let timestart = doc['timeStarts'];
      let timeend   = doc['timeEnds'];

      if(typeof timestart === 'string' && timestart.length === 5) {
        let startTime = timestart.slice(0, 5).split(":");
        let hour : number  = Number(startTime[0]);
        let min  : number  = Number(startTime[1]);
        let ts:Moment = moment(report_date).startOf('day').hour(hour).minute(min);
        this.time_start = ts;
      } else if(typeof timestart === 'string') {
        this.time_start = moment(timestart);
      } else {
        let start = moment(timestart);
        this.time_start = start;
      }

      if(typeof timeend === 'string' && timeend.length === 5) {
        let endTime = doc['timeEnds'].slice(0, 5).split(":");
        let hour = Number(endTime[0]);
        let min = Number(endTime[1]);
        let te = moment(report_date).startOf('day').hour(hour).minute(min);
        // this.time_end = te.format("HH:mm");
        this.time_end = te;
      } else if(typeof timeend === 'string') {
        this.time_end = moment(timeend);
      } else {
        let end = moment(timeend);
        this.time_end = end;
      }

      let repair_hours = doc['repairHrs'] !== undefined ? doc['repairHrs'] : doc['repair_hours'] !== undefined ? doc['repair_hours'] : 0;
      let hr1 = Number(repair_hours);
      if(!isNaN(hr1)) {
        this.repair_hours = hr1;
      } else {
        let repairHours = doc['repairHrs'].slice(0, 5).split(":");
        let hrs = Number(repairHours[0]);
        let min = Number(repairHours[1]);
        let hours = hrs + min/60;
        this.repair_hours = hours;
      }
      // let date = moment(this.report_date, "YYYY-MM-DD");
      if(doc['shiftSerial'] == undefined) {
        this.shift_serial = Report.getShiftSerial(report_date);
      }
      if(doc['payrollPeriod'] == undefined) {
        this.payroll_period = Report.getPayrollSerial(report_date);
      }
    // } catch(err) {
      // Log.l("REPORT.readFromDoc(): Error reading document:\n", doc);
      // Log.e(err);
      // throw new Error(err);
    // }
    return this;
  }

  public serialize(tech?:Employee):any {
    let fields:string[][] = [
      ["_id"             , "_id"               ] ,
      ["_rev"            , "_rev"              ] ,
      ["repairHrs"       , "repair_hours"      ] ,
      ["uNum"            , "unit_number"       ] ,
      ["wONum"           , "work_order_number" ] ,
      ["notes"           , "notes"             ] ,
      ["rprtDate"        , "report_date"       ] ,
      ["lastName"        , "last_name"         ] ,
      ["firstName"       , "first_name"        ] ,
      ["client"          , "client"            ] ,
      ["location"        , "location"          ] ,
      ["locID"           , "location_id"       ] ,
      ["shift"           , "shift_time"        ] ,
      ["shiftLength"     , "shift_length"      ] ,
      ["shiftStartTime"  , "shift_start_time"  ] ,
      ["shiftSerial"     , "shift_serial"      ] ,
      ["workSite"        , "workSite"          ] ,
      ["payrollPeriod"   , "payroll_period"    ] ,
      ["technician"      , "technician"        ] ,
      ["timeStamp"       , "timestamp"         ] ,
      ["timeStampM"      , "timestampM"        ] ,
      ["username"        , "username"          ] ,
      ["timeStarts"      , "time_start"        ] ,
      ["timeEnds"        , "time_end"          ] ,
      ["change_log"      , "change_log"        ] ,
      ["invoiced"        , "invoiced"          ] ,
      ["invoiced_dates"  , "invoiced_dates"    ] ,
      ["flagged"         , "flagged"           ] ,
      ["flagged_fields"  , "flagged_fields"    ] ,
      ["preauthed"       , "preauthed"         ] ,
      ["preauth_dates"   , "preauth_dates"     ] ,
      ["invoiced"        , "invoiced"          ] ,
      ["invoiced_date"   , "invoiced_date"     ] ,
      ["invoiced_dates"  , "invoiced_dates"    ] ,
      ["invoice_numbers" , "invoice_numbers"   ] ,
      ["crew_number"     , "crew_number"       ] ,
      ["paid"            , "paid"              ] ,
      ["paid_date"       , "paid_date"         ] ,
    ];
    let doc:any = {};
    // try {
    let len = fields.length;
    for(let keypair of fields) {
      let docKey = keypair[0];
      let thisKey = keypair[1];
      if(this[thisKey] != undefined) {
        if(thisKey === 'report_date') {
        // this[thisKey] = moment(doc[docKey], "YYYY-MM-DD");
          doc[docKey] = this[thisKey];
        } else if(thisKey === 'time_start' || thisKey === 'time_end' || thisKey === 'timestampM') {
          /* All Moment objects should be included here */
          doc[docKey] = moment(this[thisKey]).format();
        } else if(Array.isArray(this[thisKey])) {
          doc[docKey] = this[thisKey].slice(0);
        } else {
          doc[docKey] = this[thisKey];
        }
      } else {
        doc[docKey] = "";
      }
    }
    return doc;
  }

  public static deserialize(doc:any):Report {
    let report = new Report();
    report.readFromDoc(doc);
    return report;
  }

  public deserialize(doc:any):Report {
    this.readFromDoc(doc);
    return this;
  }

  public clone():Report {
    // let doc:any = this.serialize();
    let doc:any = this.serialize();
    let newWO:Report = Report.deserialize(doc);

    // let keys:string[] = Object.keys(this);
    // for(let key of keys) {
    //   let value = this[key];
    //   if(moment.isMoment(value)) {
    //     newWO[key] = moment(this[key]);
    //   } else if(typeof value === 'object') {
    //     newWO[key] = oo.clone(value);
    //   } else {
    //     newWO[key] = value;
    //   }
    // }
    return newWO;
  }

  public getReportID():string {
    if(this._id) {
      return this._id;
    } else {
      return "";
    }
  }

  public static getPayrollPeriodDate(date:Moment|Date):Moment {
    let scheduleStartsOnDay:number = 3;
    let day:Moment, periodStart:Moment;
    // return this.shift_week;
    day = moment(date).startOf('day');
    if(day.isoWeekday() >= scheduleStartsOnDay) {
      periodStart = day.isoWeekday(scheduleStartsOnDay).startOf('day');
    } else {
      periodStart = moment(day).subtract(1, 'weeks').isoWeekday(scheduleStartsOnDay).startOf('day');
    }
    return periodStart;
  }

  public static getPayrollSerial(shiftDate:Moment|Date):number {
    let date:Moment          = Report.getPayrollPeriodDate(moment(shiftDate));
    let start:Moment         = moment(date).startOf('day');
    let serial:number        = start.toExcel(true);
    let serial_number:number = serial;
    return serial_number;
  }

  public static getShiftNumber(shiftDate:Moment|Date):number {
    let startDay:number = 3;
    let date:Moment = moment(shiftDate);
    let i:number = date.isoWeekday();
    return ((i + 4) % 7) + 1;
  }

  public static getShiftWeek(shiftDate:Moment|Date) {
    let scheduleStartsOnDay:number = 3;
    let day:Moment = moment(shiftDate);
    let shift_week:Moment;
    if(day.isoWeekday() >= scheduleStartsOnDay) {
      shift_week = moment(day).isoWeekday(scheduleStartsOnDay);
    } else {
      shift_week = moment(day).subtract(1, 'weeks').isoWeekday(scheduleStartsOnDay);
    }
    return shift_week;
  }

  public static getShiftSerial(shiftDate:Moment|Date):string {
    let date:Moment = moment(shiftDate);
    let week:number = Report.getShiftWeek(date).toExcel(true);
    let num:string = sprintf("%02d", Report.getShiftNumber(date));
    let shift_serial:string = `${week}_${num}`;
    return shift_serial;
    // let num = sprintf("%02d", this.shift_number);
    // let strShiftID = `${week}_${num}`;
    // this.shift_serial = strShiftID;
    // return strShiftID;
  }

  public getRepairHours():number {
    let val = Number(this.repair_hours) || 0;
    return val;
  }

  public getRepairHoursString():string {
    let hours = this.getRepairHours();
    let h = Math.trunc(hours);
    let m = (hours - h) * 60;
    let out = sprintf("%02d:%02d", h, m);
    return out;
  }

  public getReportDate(asString?:boolean):Moment|string {
    if(asString) {
      return this.getReportDateAsString();
    } else {
      // let date = moment(this.report_date, "YYYY-MM-DD");
      // return date;
      if(typeof this.report_date === 'string') {
        return moment(this.report_date, "YYYY-MM-DD");
      } else {
        return moment(this.report_date);
      }
    }
  }

  public getReportDateAsString():string {
    let reportDate:any = this.report_date;
    if(isMoment(reportDate) || reportDate instanceof Date) {
      let mo = moment(reportDate);
      return mo.format("YYYY-MM-DD");
    } else if(typeof reportDate === 'string') {
      let mo = moment(reportDate, "YYYY-MM-DD");
      return mo.format("YYYY-MM-DD");
    } else {
      return moment(reportDate).format("YYYY-MM-DD");
    }
  }

  public getReportDateAsMoment():Moment {
    let reportDate:any = this.report_date;
    if(isMoment(reportDate) || reportDate instanceof Date) {
      let mo = moment(reportDate);
      return mo;
    } else if(typeof reportDate === 'string') {
      let mo = moment(reportDate, "YYYY-MM-DD");
      return mo;
    } else {
      return moment(reportDate);
    }
  }

  public getReportDateAsExcel():number {
    return this.getReportDateAsMoment().toExcel(true);
  }

  public getStartTime():Moment {
    return moment(this.time_start);
  }

  public setStartTime(time:Date|Moment):Moment {
    this.time_start = moment(time);
    this.checkTimeCalculations(0);
    return this.time_start;
  }

  public getEndTime():Moment {
    return moment(this.time_end);
  }

  public setEndTime(time:Date|Moment):Moment {
    this.time_end = moment(time);
    this.checkTimeCalculations(1);
    return this.time_end;
  }

  public getStartTimeAsExcel():number {
    return this.getStartTime().toExcel();
  }

  public getEndTimeAsExcel():number {
    return this.getEndTime().toExcel();
  }

  public setRepairHours(durationInHours:number|Duration):number {
    if(durationInHours != undefined) {
      if(isDuration(durationInHours) || typeof durationInHours === 'number') {
        let duration:Duration = isDuration(durationInHours) ? moment.duration(durationInHours) : typeof durationInHours === 'number' ? moment.duration(durationInHours, 'hour') : moment.duration(0, 'hour');
        let hours:number = duration.asHours();
        this.repair_hours = hours;
        this.checkTimeCalculations(2);
        return this.repair_hours;
      } else {
        Log.w("Report.setRepairHours(): Need a duration or number, was given this:\n", durationInHours);
      }
    } else {
      Log.w("Report.setRepairHours(): Need a duration or number, was given this undefined/null value:\n", durationInHours);
  }
    // if(moment.isDuration(duration)) {
    //   this.repair_hours = (duration.asHours();
    //   this.checkTimeCalculations(2);
    //   return this.repair_hours;
    // } else if(typeof duration === 'number') {
    //   this.repair_hours = duration;
    //   this.checkTimeCalculations(2);
    //   return this.repair_hours;
    // } else {
    //   Log.l("Report.setRepairHours(): Need a duration or number, was given this:\n", duration);
    // }
  }

  public adjustEndTime() {
    let start = this.time_start;
    let time:any = this.repair_hours;
    let end = this.time_end;
    // Log.l("adjustEndTime(): Now adjusting end time of work report. time_start, repair_hours, and time_end are:\n", start, time, end);
    if (typeof time !== 'number') {
      if (moment.isDuration(time)) {
        time = time.asHours();
      }
    }
    if(start !== null && isMoment(start) && typeof time === 'number') {
      let newEnd = moment(start).add(time, 'hours');
      if (end.isSame(newEnd)) {
        Log.l("adjustEndTime(): No need, end time is already correct.");
      } else {
        Log.l("adjustEndTime(): Adjusting end time to:\n", newEnd);
        this.time_end = newEnd;
      }
    } else {
      Log.l("adjustEndTime(): Can't adjust end time, time_start is not a valid moment or repair_hours is not a number:\n", start, time);
    }
  }

  public checkTimeCalculations(mode:number) {
    let start = this.time_start;
    let end = this.time_end;
    let time = this.repair_hours;
    // let flag = false;
    if(isMoment(start) && isMoment(end) && start !== null && end !== null && typeof time === 'number') {
      let check = moment(start).add(time, 'hours');
      if(!check.isSame(end)) {
        Log.w("WO.checkTimeCalculations(): Start time plus repair hours does not equal end time!");
        Log.w("Start: %s\nEnd: %s\nHours: %s", start.format(), end.format(), time);
        this.adjustEndTime();
      }
    } else if(isMoment(start) && typeof time === 'number') {
      let end = moment(start).add(time, 'hours');
      this.time_end = end;
    } else if(isMoment(end) && typeof time === 'number') {
      let start = moment(end).subtract(time, 'hours');
      this.time_start = start;
    } else if(isMoment(start) && isMoment(end)) {
      let hours = moment(end).diff(start, 'hours', true);
      this.repair_hours = hours;
    } else {
      Log.w("Report.checkTimeCalculations(): Start or end times are not moments, or repair hours is not a number/duration!\nStart: %s\nEnd: %s\nHours: %s", start, end, time);
    }
  }

  public genReportID(tech:Employee):string {
    let now = moment();
    // let idDateTime = now.format("dddDDMMMYYYYHHmmss");
    let idDateTime = now.format("YYYY-MM-DD_HH-mm-ss_ZZ_ddd");
    let docID = tech.avatarName + '_' + idDateTime;
    Log.l("genReportID(): Generated ID:\n", docID);
    return docID;
  }

  public matchesSite(site:Jobsite):boolean {
    if(!(site instanceof Jobsite)) {
      Log.w(`Report.matchesSite(): Must be called with Jobsite object. Called with:\n`, site);
      return false;
    } else {
      if(this.site_number && this.site_number === site.site_number) {
        // Log.l("Report: matched report to site:\n", this);
        // Log.l(site);
        return true;
      } else {
        let siteCLI = site.client.name.toUpperCase();
        let siteLOC = site.location.name.toUpperCase();
        let siteLID = site.locID.name.toUpperCase();
        let siteCLI2 = site.client.fullName.toUpperCase();
        let siteLOC2 = site.location.fullName.toUpperCase();
        let siteLID2 = site.locID.fullName.toUpperCase();
        let cli = this.client      ? this.client.toUpperCase() :      "ZZ";
        let loc = this.location    ? this.location.toUpperCase() :    "Z";
        let lid = this.location_id ? this.location_id.toUpperCase() : "ZZZZZZ";
        if((cli === siteCLI || cli === siteCLI2) && (loc === siteLOC || loc === siteLOC2) && (lid === siteLID || lid === siteLID2)) {
          // Log.l("Report: matched report to site:\n", this);
          // Log.l(site);
          return true;
        } else {
          return false;
        }
      }
    }
  }

  public setSite(site:Jobsite):Report {
    this.client      = site.client.name;
    this.location    = site.location.name;
    this.location_id = site.locID.name;
    this.workSite    = site.getSiteSelectName();
    this.site_number = site.site_number;
    return this;
  }

  public get flags():number {
    return this.flagged_fields && this.flagged_fields.length ? this.flagged_fields.length : 0;
  }

  public getFlagNumber(value:number) {
    if(this.flagged_fields && this.flagged_fields.length > value) {
      return this.flagged_fields[value];
    } else {
      Log.w(`Report.getFlagNumber(): Attempted to access flag '${value}' but flagged_fields has only ${this.flagged_fields.length} elements!`);
      return null;
    }
  }

  public isFlagged():boolean {
    return Boolean(this.flags);
  }

  public isFieldFlagged(field:string) {
    if(this.flagged_fields && this.flagged_fields.length) {
      let flag = this.flagged_fields.find((a:ReportFlag) => {
        return a.field === field;
      });
      if(flag) {
        return true;
      }
    }
    let keys = Object.keys(this);
    if(keys.indexOf(field) === -1 && field !== 'manual') {
      Log.w(`Report.isFieldFlagged(): no such field '${field}'!`);
    }
    return false;
  }

  public setFlag(field:string, reason:string) {
    let flag:ReportFlag = {
      field: field,
      reason: reason
    };
    this.flagged_fields = this.flagged_fields || [];
    if(field === 'manual') {
      this.flagged_fields.push(flag);
    } else {
      let existingFlag = this.flagged_fields.find((a:ReportFlag) => {
        return a.field === field;
      });
      if(existingFlag) {
        existingFlag.field  = field;
        existingFlag.reason = reason;
      } else {
        this.flagged_fields.push(flag);
      }
    }
  }

  public unsetFlag(field:string) {
    this.flagged_fields = this.flagged_fields || [];
    let index = this.flagged_fields.findIndex((a:ReportFlag) => {
      return a.field === field;
    });
    if(index > -1) {
      let flag:ReportFlag = this.flagged_fields.splice(index, 1)[0];
      return flag;
    } else {
      return undefined;
    }
  }

  public clearFlags() {
    this.flagged_fields = [];
    this.flagged = false;
  }

  public addStatusUpdate(type:StatusUpdateType, username:string):ReportStatusLogEntry[] {
    let now:Moment = moment();
    let timestamp:string = now.format();
    let logEntry:ReportStatusLogEntry = {
      type     : type     ,
      user     : username ,
      timestamp: timestamp,
    };
    this.change_log.push(logEntry);
    Log.l(`Report.addStatusUpdate(): added '${type}' entry, change_log is now:\n`, this.change_log);
    return this.change_log;
  }

  public setInvoiced(invoice:number, username:string) {
    let now:Moment = moment();
    let ts:string = now.format();
    let logEntry:ReportStatusLogEntry = {
      type      : 'invoiced' ,
      user      : username   ,
      timestamp : ts         ,
      invoice   : invoice    ,
    };
    this.change_log.push(logEntry);
    this.invoiced = true;
    let invoiceDate:string = now.format("YYYY-MM-DD");
    this.invoiced_dates.push(invoiceDate);
    this.invoice_numbers.push(invoice);
  }

  public setPaid(username:string) {
    let now:Moment = moment();
    let ts:string = now.format();
    let logEntry:ReportStatusLogEntry = {
      type      : 'paid'   ,
      user      : username ,
      timestamp : ts       ,
    };
    this.change_log.push(logEntry);
    let paidDate:string = now.format("YYYY-MM-DD");
    this.paid = true;
    this.paid_date = paidDate;
    return this.change_log;
  }

  public isPremiumEligible():boolean {
    return this.premium_eligible;
  }

  public setPremiumStatus(site:Jobsite):boolean {
    if(site instanceof Jobsite) {
      if(site.premium_hours) {
        this.premium_eligible = true;
      } else {
        this.premium_eligible = false;
      }
    }
    return this.premium_eligible;
  }

  // public splitReportID(reportID?:string) {
  //   let id = reportID || this._id;
  //   let splits = id.split("_");
  //   let len = splits.length;
  //   let num = 0, strNum = "", newID = "";
  //   if(splits[len - 2] === "split") {
  //     // num = Number(splits[len - 1]);
  //     num = Number(this.split_count);
  //     if(!isNaN(num)) {
  //       num++;
  //       strNum = sprintf("%02d", num);
  //       splits.pop();
  //       // splits.pop();
  //       for(let chunk of splits) {
  //         newID += chunk + "_";
  //       }
  //       newID += strNum;
  //     }
  //   } else {
  //     num = Number(this.split_count);
  //     if(!isNaN(num)) {
  //       num++;
  //       strNum = sprintf("%02d", num);
  //     // newID = id + "_split_01";
  //   }
  //   return newID;
  //   // let match = /(.*)(?:_split_)?()/g;
  // }

  // public split() {
  //   let report = this;
  //   let reportDoc = report.serialize();
  //   let newReport = new Report();
  //   newReport.readFromDoc(reportDoc);
  //   report.split_count++;
  //   newReport.split_count++;
  //   newReport._rev = "";
  //   newReport._id = this.splitReportID(report._id);
  //   let start = moment(report.time_start);
  //   let hours = report.getRepairHours();
  //   let splitHours1 = hours / 2;
  //   let splitHours2 = hours / 2;
  //   let splitMinutes1 = hours * 30;
  //   let splitMinutes2 = hours * 30;
  //   let remainder = splitMinutes1 % 30;
  //   if(remainder !== 0) {
  //     splitMinutes1 += remainder;
  //     splitMinutes2 -= remainder;
  //   }
  //   splitHours1 = splitMinutes1 / 60;
  //   splitHours2 = splitMinutes2 / 60;
  //   // let newStart = moment(start).add(splitMinutes1, 'minutes');
  //   report.setRepairHours(splitHours1);
  //   let end = moment(report.time_end);
  //   newReport.setStartTime(end);
  //   newReport.setRepairHours(splitHours2);
  // }

  public getKeys():string[] {
    let keys:string[] = Object.keys(this);
    return keys;
  }
  public isOnSite():boolean {
    return true;
  }
  public toJSON():any {
    return this.serialize();
  }
  public static fromJSON(doc:any):Report {
    return Report.deserialize(doc);
  }
  public getClass():any {
    return Report;
  }
  public static getClassName():string {
    return 'Report';
  }
  public getClassName():string {
    return Report.getClassName();
  }
  public get [Symbol.toStringTag]():string {
    return this.getClassName();
  };
}