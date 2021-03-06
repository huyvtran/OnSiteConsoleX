/**
 * Name: Shift domain class
 * Vers: 6.2.1
 * Date: 2018-08-08
 * Auth: David Sargeant
 * Logs: 6.2.1 2018-08-08: Slightly changed premium hours calculation (but it still needs to be pulled from Jobsite, not report client)
 * Logs: 6.1.1 2018-06-05: Added timesheet property
 * Logs: 6.0.1 2018-05-31: Changed the way bonus hours are calculated (3 extended hours is only for > 8 hours, not >= 8 hours) and added error check to _sortReports() function
 * Logs: 5.4.2 2018-02-21: Changed getShiftStatus() to fix coloring for S shift lengths with work reports
 * Logs: 5.4.1 2018-02-21: Changed getShiftStatus() return value for T/Q/M/V shifts with work reports
 * Logs: 5.3.1 2018-02-12: Mike changed getShiftStatus() logic significantly without updating all versions of Shift. For shame.
 * Logs: 5.2.1 2018-02-09: Added getShiftTimeline() method
 * Logs: 5.1.1 2018-02-08: Added getFlaggedReports() method
 * Logs: 5.0.2 2018-01-29: Added getAllShiftHours() method
 * Logs: 5.0.1 2017-12-15: Merged app and console versions
 * Logs: 4.2.2 2017-12-04: Added getBillableHours method
 * Logs: 4.2.1 2017-11-13: Added getShiftName method
 * Logs: 4.1.1 2017-08-22: Unknown
 */

/**
 * TODO: 2018-08-08: Premium hours need to be changed to pull from Jobsite property, not just check report client
 */

import { sprintf     } from 'sprintf-js'    ;
import { Log         } from '../config'     ;
import { Moment      } from '../config'     ;
import { Report      } from './report'      ;
import { ReportOther } from './reportother' ;
import { Jobsite     } from './jobsite'     ;
import { Employee    } from './employee'    ;
import { Timesheet   } from './timesheet'   ;
import { isMoment    } from '../config'     ;
import { moment      } from '../config'     ;

const _sortReports = (a:Report, b:Report): number => {
  if(a instanceof Report && b instanceof Report) {
    let dateA:any  = moment(a.report_date).startOf('day');
    let dateB:any  = moment(b.report_date).startOf('day');
    let startA = moment(a.time_start);
    let startB = moment(b.time_start);
    // dateA  = isMoment(dateA)  ? dateA  : moment(dateA).startOf('day');
    // dateB  = isMoment(dateB)  ? dateB  : moment(dateB).startOf('day');
    // startA = isMoment(startA) ? startA : moment(startA);
    // startB = isMoment(startB) ? startB : moment(startB);
    return dateA.isBefore(dateB) ? -1  : dateA.isAfter(dateB) ? 1 : startA.isBefore(startB) ? -1 : startA.isAfter(startB) ? 1 : 0;
  } else {
    return 0;
  }
};

// const enum ReportType {
//   'standby'  = 0,
//   'training' = 1,
//   'travel'   = 2,
//   'holiday'  = 3,
//   'vacation' = 4,
//   'sick'     = 5,
// };

// const enum reportType {
//   'Standby'     = 0,
//   'Training'    = 1,
//   'Travel'      = 2,
//   'Holiday'     = 3,
//   'Vacation'    = 4,
//   'Sick'        = 5,
//   'Work Report' = 6,
// };

export class Shift {
  public site_name           :string                    ;
  public shift_id            :number                    ;
  public shift_week_id       :number                    ;
  public payroll_period      :any                       ;
  public shift_week          :any                       ;
  public shift_time          :string             = "AM" ;
  public start_time          :any                       ;
  public shift_length        :string                    ;
  public shift_number        :any                       ;
  public current_payroll_week:any                       ;
  public colors              :any                = {}   ;
  public XL                  :any                       ;
  public shift_serial        :any                       ;
  public shift_hours         :any                       ;
  public shift_reports       :Report[]      = []   ;
  public other_reports       :ReportOther[] = []   ;
  public site                :Jobsite                   ;
  public tech                :Employee                  ;
  public timesheet           :Timesheet                 ;

  constructor(site_name?, shift_week?, shift_time?, start_time?, shift_length?) {
    if(arguments.length == 1 && typeof arguments[0] == 'object') {
      this.readFromDoc(arguments[0]);
    } else {
      this.site_name      = site_name    || ''       ;
      this.shift_week     = shift_week   || ''       ;
      this.shift_time     = shift_time   || 'AM'     ;
      this.start_time     = start_time   || ''       ;
      this.shift_length   = shift_length || -1       ;
      this.shift_id       = -1                       ;
      this.shift_number   = -1                       ;
      this.shift_week_id  = -1                       ;
      this.payroll_period = null                     ;
      this.shift_serial   = null                     ;
      this.shift_hours    = 0                        ;
      this.shift_reports  = this.shift_reports || [] ;
      this.other_reports  = this.other_reports || [] ;
      this.site           = null                     ;
      this.tech           = null                     ;
      this.timesheet      = new Timesheet()          ;
      this.updateShiftNumber();
      this.colors = { 'red': false, 'green': false, 'blue': false };
      this.XL = { 'shift_time': null, 'shift_week': null, 'current_payroll_week': null };
      this.getShiftWeek();
      this.getShiftColor();
      this.getCurrentPayrollWeek();
      this.getExcelDates();
      this.getShiftNumber();
      this.getShiftSerial();
    }
  }

  public readFromDoc(doc) {
    for(let prop in doc) {
      this[prop] = doc[prop];
    }
    this.getShiftColor();
  }

  public getStartTime() {
    if(isMoment(this.start_time)) {
      return moment(this.start_time);
    } else {
      Log.w("getStartTime(): Can't, start_time is not a moment:\n", this.start_time);
    }
  }

  public setStartTime(time:Date|Moment|string) {
    let start;
    if(time && (isMoment(time) || time instanceof Date)) {
      start = moment(time);
      this.start_time = start;
    } else if(time && typeof time === 'string' && time.length > 5) {
      start = moment(time);
      this.start_time = start;
    } else if(time && typeof time === 'string') {
      let xl = this.shift_id;
      start = moment().fromExcel(xl);
      let times = time.split(":");
      let hrs = Number(times[0]);
      let min = Number(times[1]);
      if(!isNaN(hrs)) {
        start.hour(hrs);
      }
      if(!isNaN(min)) {
        start.minutes(min);
      }
      this.start_time = start;
    }
    return this.start_time;
  }

  public setTech(tech:Employee) {
    this.tech = tech;
    return this.tech;
  }

  public getTech() {
    return this.tech;
  }

  public setJobsite(site:Jobsite) {
    this.site = site;
    return this.site;
  }

  public getJobsite():Jobsite {
    return this.site;
  }

  public getShiftID() {
    return this.shift_id;
  }

  public setShiftID(value:any) {
    this.shift_id = value;
    return this.shift_id;
  }

  public getShiftDate():Moment {
    let date = moment().fromExcel(this.getShiftID());
    return date;
  }

  public getShiftWeek() {
    let scheduleStartsOnDay = 3;
    let day = moment(this.start_time);
    if(day.isoWeekday() >= scheduleStartsOnDay) {
      this.shift_week = day.isoWeekday(scheduleStartsOnDay);
    } else {
      this.shift_week = moment(day).subtract(1, 'weeks').isoWeekday(scheduleStartsOnDay);
    }
    return this.shift_week;
  }

  public getShiftNumber() {
    this.getShiftWeek();
    this.getExcelDates();
    let shiftNumber = Math.trunc(this.XL.shift_time - this.XL.shift_week + 1);
    this.shift_number = shiftNumber;
    return shiftNumber;
  }

  public getCurrentPayrollWeek() {
    let scheduleStartsOnDay = 3;
    let now = moment();
    // let day = moment(this.start_time);
    if(now.isoWeekday() >= scheduleStartsOnDay) {
      this.current_payroll_week = now.isoWeekday(scheduleStartsOnDay);
    } else {
      this.current_payroll_week = moment(now).subtract(1, 'weeks').isoWeekday(scheduleStartsOnDay).startOf('day');
    }
    return this.current_payroll_week;
  }

  public updateShiftWeek() {
    // Schedule starts on day 3 (Wednesday)
    return this.getShiftWeek();
  }

  public updateShiftNumber() {
    let start = this.start_time;
    let week = this.shift_week;
    if(moment.isMoment(start) && moment.isMoment(week)) {
      this.shift_number = start.diff(week, 'days') + 1;
    } else {
      this.shift_number = -1;
    }
    return this.shift_number;
  }

  public getShiftDescription() {
    // return this.site_name;
    let shiftWeek = this.shift_week.format("M/DD");
    // let shiftWeekDay = moment(this.shift_week).day() - 3;
    let end_shift_week = moment(this.shift_week).add(6, 'days');
    let shiftNum = Math.abs(this.start_time.diff(this.shift_week, 'days')) + 1;
    let endWeek = end_shift_week.format("MMM D");
    let dayStr = moment(this.start_time).format("MMM D");
    // let thisDay = this.start_time.day();
    // let thisDay = moment(this.start_time).day() - shiftWeekDay;

    // return `${dayStr} (Shift ${shiftNum} in ${shiftWeek}-${endWeek})`;
    return `${dayStr} (Shift week ${shiftWeek})`;
  }

  public getShiftWeekID() {
    let shift_week_number = -1;
    // let start_date = moment(XL);
    if(isMoment(this.shift_week)) {
      // shift_week_number = this.shift_week.diff(XL, 'days') + 2;
      shift_week_number = moment(this.shift_week).toExcel(true);
    }
    return shift_week_number;
  }

  public getPayrollPeriod() {
    return this.getShiftWeekID();
  }

  public isShiftInCurrentPayPeriod() {
    let now = moment();
    let day = moment(this.start_time);
    let week = moment(this.shift_week);
    let nowXL = moment(now).toExcel();
    let dayXL = moment(now).toExcel(true);
    let weekXL = moment(week).toExcel(true);
    let nextWeekXL = weekXL + 7;
    if(dayXL >= weekXL && dayXL < nextWeekXL) {
      return true;
    } else {
      return false;
    }
  }

  public static getShiftNumber(shiftDate:Moment|Date) {
    let startDay = 3;
    let date = moment(shiftDate);
    let i = date.isoWeekday();
    return ((i + 4) % 7) + 1;
    // let

  }

  public static getShiftWeek(shiftDate:Moment|Date) {
    let scheduleStartsOnDay = 3;
    let day = moment(shiftDate);
    let shift_week = null;
    if(day.isoWeekday() >= scheduleStartsOnDay) {
      shift_week = moment(day).isoWeekday(scheduleStartsOnDay);
    } else {
      shift_week = moment(day).subtract(1, 'weeks').isoWeekday(scheduleStartsOnDay);
    }
    return shift_week;
  }

  public static getShiftSerial(shiftDate:Moment|Date) {
    let date = moment(shiftDate);
    let week = Shift.getShiftWeek(date).toExcel(true);
    let num = sprintf("%02d", Shift.getShiftNumber(date));
    let shift_serial = `${week}_${num}`;
    return shift_serial;
    // let num = sprintf("%02d", this.shift_number);
    // let strShiftID = `${week}_${num}`;
    // this.shift_serial = strShiftID;
    // return strShiftID;
  }

  public getShiftSerial(shiftDate?:Moment|Date) {
    this.getExcelDates();
    let week = this.shift_week_id;
    let num = sprintf("%02d", this.shift_number);
    let strShiftID = `${week}_${num}`;
    this.shift_serial = strShiftID;
    return strShiftID;
  }

  public getExcelDates() {
    let now                      = moment()                             ;
    let day                      = moment(this.start_time)              ;
    let week                     = moment(this.getShiftWeek())          ;
    let nowWeek                  = moment(this.getCurrentPayrollWeek()) ;
    let nowXL                    = now.toExcel()                        ;
    let dayXL                    = day.toExcel(true)                    ;
    let weekXL                   = week.toExcel(true)                   ;
    let currentWeekXL            = nowWeek.toExcel(true)                ;
    let nextWeekXL               = weekXL + 7                           ;
    this.shift_week_id           = weekXL                               ;
    this.payroll_period          = weekXL                               ;
    this.shift_id                = dayXL                                ;
    this.XL.today_XL             = nowXL                                ;
    this.XL.shift_time           = dayXL                                ;
    this.XL.shift_id             = dayXL                                ;
    this.XL.shift_week           = weekXL                               ;
    this.XL.current_payroll_week = currentWeekXL                        ;
    this.XL.next_week_XL         = nextWeekXL                           ;
    return this.XL;
  }

  public getScheduledShiftLength() {

  }

  public getNextReportStartTime():Moment {
    let reports = this.getShiftReports();
    reports.sort(_sortReports);
    let start = this.getStartTime();
    let begin = moment(start);
    let debugString = ` START: ${start.format("YYYY-MM-DDTHH:mm")}\n`;
    for(let report of reports) {
      let hours = report.getRepairHours();
      let hrs = Math.trunc(hours);
      let min = (hours - hrs) * 60;
      let out = sprintf("%02d:%02d", hrs, min);
      // let duration = moment.duration(hours, 'hours');
      // debugString += `   ADD: ${duration.hours()}:${duration.minutes()}\n`
      debugString += `    ADD:             ${out}\n`
      begin.add(hours, 'hours');
      debugString += ` RESULT: ${begin.format("YYYY-MM-DDTHH:mm")}\n`;
    }
    Log.l(`WORKORDER.getNextReportStartTime(): next start time is '${begin.format("YYYY-MM-DDTHH:mm")}'. Debug chain:\n`, debugString);
    return begin;
  }

  public getShiftLength(newHours?:number|string) {
    let hrs = newHours ? String(newHours) : "";
    let retVal:any = this.shift_length;
    let regHours = this.getNormalHours();
    let status = this.getShiftReportsStatus();
    if(retVal == 0) {
      return 'off';
    } else {
      if(hrs) {
        if(String(retVal) === 'S' || status.status) {
          return hrs;
        } else {
          return regHours;
        }
      } else {
        return retVal;
      }
    }
  }

  public setShiftLength(hours:number) {
    this.shift_length = String(hours);
    return this.shift_length;
  }

  public updateShiftSiteInfo(site:Jobsite, tech:Employee) {
    let shiftTime = tech.getShiftType();
    let rotation  = tech.getShiftRotation();
    let date = moment(this.start_time).startOf('day');
    let shiftLength = site.getShiftLengthForDate(rotation, shiftTime, date);
    this.setShiftLength(shiftLength);
    let startHours = site.getShiftStartTime(shiftTime);
    let hours = moment.duration(startHours, 'hours');
    let startTime = moment(date).add(hours.hours(), 'hours').add(hours.minutes(), 'minutes');
    this.start_time = startTime;
  }

  public getShiftColor() {
    let now = moment();
    this.getExcelDates();
    let colorClass = "";
    let dayXL = this.XL.shift_id;
    let nowXL = this.XL.today_XL;
    let weekXL = this.XL.shift_week;
    let prWeek = this.XL.current_payroll_week;
    if(dayXL == nowXL) {
      colorClass = "green";
    } else if(dayXL < prWeek) {
      colorClass = "red";
    } else {
      colorClass = "blue";
    }
    // Log.l("getShiftColor(): Shift is now:\n", this);
    return colorClass;
  }

  public getShiftClasses() {
    this.getShiftColor();
    return this.colors;
  }

  public isRed() {
    // this.getShiftColor();
    return this.colors.red;
  }
  public isGreen() {
    // this.getShiftColor();
    return this.colors.green;
  }
  public isBlue() {
    // this.getShiftColor();
    return this.colors.blue;
  }

  public getTotalShiftHours() {
    return this.getNormalHours();
  }

  public getTotalPayrollHoursForShift() {
    let shiftTotal = this.getTotalShiftHours();
    let bonusHours = this.getTotalBonusHoursForShift();
    shiftTotal += bonusHours;
    // Log.l("getTotalPayrollHoursForShift(): For shift %s, %d reports, %f hours, %f hours eligible, so bonus hours = %f.\nShift total: %f hours.", this.getShiftSerial(), this.shift_reports.length, shiftTotal, countsForBonusHours, bonusHours, shiftTotal);
    return shiftTotal;
  }

  public getTotalBonusHoursForShift() {
    let shiftTotal = 0, bonusHours = 0, countsForBonusHours = 0;
    for(let report of this.shift_reports) {
      if(!report['type'] || report['type'] === 'Work Report') {
        let subtotal = report.getRepairHours();
        shiftTotal += subtotal;
        if(report.client !== "SESA" && report.client !== 'SE') {
          countsForBonusHours += subtotal;
        }
      }
    }
    if(countsForBonusHours >= 8 && countsForBonusHours <= 11) {
      bonusHours = 3;
    } else if(countsForBonusHours > 11) {
      bonusHours = 3 + (countsForBonusHours - 11);
    }
    // Log.l("getTotalPayrollHoursForShift(): For shift %s, %d reports, %f hours, %f hours eligible, so bonus hours = %f.\nShift total: %f hours.", this.getShiftSerial(), this.shift_reports.length, shiftTotal, countsForBonusHours, bonusHours, shiftTotal);
    return bonusHours;
  }

  public getNormalHours() {
    let total = 0;
    let reports = this.getShiftReports();
    for(let report of reports) {
      if(report['type'] === undefined || report['type'] === 'Work Report') {
        total += report.getRepairHours();
      }
    }
    return total;
  }

  public getBillableHours() {
    let total = 0;
    for(let report of this.shift_reports) {
      if(report['type'] === undefined || report['type'] === 'Work Report') {
        if(report.client !== 'SE' && report.client !== 'SESA') {
          total += report.getRepairHours();
        }
      }
    }
    return total;
  }

  public getPayrollHours() {
    return this.getTotalPayrollHoursForShift();
  }

  public getBonusHours() {
    return this.getTotalBonusHoursForShift();
  }

  public getTrainingHours() {
    let total:number | string = 0;
    for(let other of this.other_reports) {
      if(other.type !== undefined && other.type === 'Training') {
        total += Number(other.getTotalHours());
      }
    }
    return total;
  }

  public getTravelHours() {
    let total:number | string = 0;
    for(let other of this.other_reports) {
      if(other.type !== undefined && other.type === 'Travel') {
        total += Number(other.getTotalHours());
      }
    }
    return total;
  }

  public getStandbyHours() {
    let total = 0;
    for(let other of this.other_reports) {
      if(other.type !== undefined && (other.type === 'Standby' || other.type === 'Standby: HB Duncan')) {
        total += Number(other.getTotalHours());
      }
    }
    return total;
  }

  public getVacationHours() {
    let total = 0;
    for(let other of this.other_reports) {
      if(other.type !== undefined && other.type === 'Vacation') {
        total += Number(other.getTotalHours());
      }
    }
    return total;
  }

  public getSickHours() {
    let total = 0;
    for(let other of this.other_reports) {
      if(other.type !== undefined && other.type === 'Sick') {
        total += Number(other.getTotalHours());
      }
    }
    return total;
  }

  public getHolidayHours() {
    let total = 0;
    for(let other of this.other_reports) {
      if(other.type !== undefined && other.type === 'Holiday') {
        total += Number(other.getTotalHours());
      }
    }
    return total;
  }

  public getShiftTimeline():any[] {
    return [];
  }

  public setShiftReports(reports:Report[]) {
    this.shift_reports = reports;
    return this.shift_reports;
  }

  public addShiftReport(report:Report) {
    let reports = this.getShiftReports();
    let j = 0, i = -1;
    for(let rep of reports) {
      if(rep === report || (rep['_id'] && report['_id'] && rep['_id'] === report['_id'])) {
        i = j;
        break;
      } else {
        j++;
      }
    }
    if(i > -1) {
      // Log.l(`addShiftReport(): Report '${report._id}' already exists in shift ${this.getShiftSerial()}.`);
    } else {
      // Log.l(`removeShiftReport(): Report '${report._id}' not found in shift ${this.getShiftSerial()}:\n`, reports[i])
      reports.push(report);
    }
    this.shift_reports = reports;
    return this.shift_reports;
  }

  public removeShiftReport(report:Report) {
    let reports = this.getShiftReports();
    let j = 0, i = -1;
    for(let rep of reports) {
      if(rep === report || (rep['_id'] && report['_id'] && rep['_id'] === report['_id'])) {
        i = j;
        break;
      } else {
        j++;
      }
    }
    if(i > -1) {
      Log.l(`removeShiftReport(): Removing report #${i} from shift ${this.getShiftSerial()}:\n`, reports[i]);
      window['onsitesplicedreport'] = this.shift_reports.splice(i, 1)[0];
    } else {
      Log.l(`removeShiftReport(): Report '${report._id}' not found in shift ${this.getShiftSerial()}.`);
    }
    return this.shift_reports;
  }

  public getShiftReports():Report[] {
    return this.shift_reports;
  }

  public getShiftOtherReports():ReportOther[] {
    return this.other_reports;
  }

  public getAllShiftReports():Array<Report|ReportOther> {
    let output:Array<Report|ReportOther> = [];
    for(let report of this.getShiftReports()) {
      output.push(report);
    }
    for(let other of this.getShiftOtherReports()) {
      output.push(other);
    }
    return output;
  }

  public getOtherReports():ReportOther[] {
    return this.other_reports;
  }

  public setOtherReports(others:ReportOther[]) {
    this.other_reports = [];
    for(let other of others) {
      this.other_reports.push(other);
    }
    return this.other_reports;
  }

  public addOtherReport(other:ReportOther) {
    let j = 0, i = -1;
    let others = this.getShiftOtherReports();
    for(let oth of others) {
      if(oth === other || (oth['_id'] && other['_id'] && oth['_id'] === other['_id'])) {
        i = j;
        break;
      } else {
        j++;
      }
    }
    if(i > -1) {
      Log.l(`SHIFT.addOtherReport(): ReportOther '${other._id}' already exists in shift '${this.getShiftSerial()}'.`);
    } else {
      // Log.w(`SHIFT.addOtherReport(): Report '${other._id}' not found in shift '${this.shift_serial}'.`);
      others.push(other);
    }
    this.other_reports = others;
    return this.other_reports;
  }

  public removeOtherReport(other:ReportOther) {
    let others = this.getShiftOtherReports();
    let j = 0, i = -1;
    for(let oth of others) {
      if(oth === other || (oth['_id'] && other['_id'] && oth['_id'] === other['_id'])) {
        i = j;
        break;
      } else {
        j++;
      }
    }
    if(i > -1) {
      Log.l(`removeOtherReport(): Removing report #${i} from shift ${this.getShiftSerial()}:\n`, others[i])
      window['onsitesplicedreport'] = others.splice(i, 1)[0];
    } else {
      Log.w(`SHIFT.removeOtherReport(): Report '${other._id}' not found in shift '${this.shift_serial}'.`);
    }
    this.other_reports = others;
    return this.other_reports;
  }

  public getShiftStats(complete?:boolean) {
    return this.getShiftReportsStatus(complete);
  }

  public getShiftReportsStatus(complete?:boolean) {
    let others  = this.getShiftOtherReports() ;
    let reports = this.getShiftReports();
    let output  = []                    ;
    let data    = { status: 0, hours: 0, workHours: 0, otherReportHours: 0, code: "" };
    // M Training and Travel
    // T Training
    // Q Travel
    // S Standby for Duncan
    // E Sick Day or Sick Hrs
    // V Vacation
    // H Holiday
    for(let other of others) {
      let type = other.type;
      if(type === 'Training') {
        output.push("T");
        data.otherReportHours += other.time;
      } else if(type === 'Travel') {
        output.push("Q");
        data.otherReportHours += other.time;
      } else if(type === 'Standby') {
        output.push("B");
        data.otherReportHours += other.time;
      } else if(type === 'Standby: HB Duncan') {
        output.push("S");
      } else if(type === 'Sick') {
        output.push("E");
        data.otherReportHours += other.time;
      } else if(type === 'Vacation') {
        output.push("V");
        data.otherReportHours += other.time;
      } else if(type === 'Holiday') {
        output.push("H");
        data.otherReportHours += other.time;
      }
    }
    if(reports.length > 0) {
      let hrs = this.getNormalHours();
      data.workHours = hrs;
    }
    // Log.l("Shift: intermediate ReportOther status is:\n", output);
    if(!complete) {
      if(output.indexOf("T") > -1 && output.indexOf("Q") > -1) {
        data.code = "M";
      } else if(output.indexOf("T") > -1) {
        data.code = "T";
      } else if(output.indexOf("Q") > -1) {
        data.code = "Q";
      } else if(output.indexOf("S") > -1) {
        data.code = "S";
      } else if(output.indexOf("E") > -1) {
        data.code = "E";
      } else if(output.indexOf("V") > -1) {
        data.code = "V";
      } else if(output.indexOf("H") > -1) {
        data.code = "H";
      } else if(output.indexOf("B") > -1) {
        data.code = "S";
      } else {
        data.code = "";
      }
    } else {
      data.code = "";
      if(output.indexOf("T") > -1 && output.indexOf("Q") > -1) {
        data.code += "M";
      }
      if(output.indexOf("T") > -1) {
        data.code += "T";
      }
      if(output.indexOf("Q") > -1) {
        data.code += "Q";
      }
      if(output.indexOf("S") > -1) {
        data.code += "S";
      }
      if(output.indexOf("E") > -1) {
        data.code += "E";
      }
      if(output.indexOf("V") > -1) {
        data.code += "V";
      }
      if(output.indexOf("H") > -1) {
        data.code += "H";
      }
      if(output.indexOf("B") > -1) {
        data.code += "S";
      }
    }
    if(data.code) {
      data.status = 1;
    }
    return data;
  }

  public getShiftCode() {
    let res = this.getShiftStats();
    let code = res.code;
    let hours = res.workHours;
    let otherHours = res.otherReportHours;
    if(code) {
      if(!hours) {
        return code;
      } else {
        return hours;
      }
    } else {
      return hours;
    }
  }

  public getSpecialHours(type?:string) {
    let others    = this.getShiftOtherReports();
    let total     = 0;
    let codeTotal = 0;
    let codes     = "";
    for(let other of others) {
      if(type) {
        if(other.type === type) {
          let hours = other.getTotalHours();
          if(typeof hours === 'number') {
            total += hours;
          } else {
            codes += hours;
            if(hours === "S") {
              total += 8;
            }
          }
        }
      } else {
        let hours = other.getTotalHours();
        if(typeof hours === 'number') {
          total += hours;
        } else {
          codes += hours;
          if(hours === "S") {
            total += 8;
          }
        }
      }
    }
    return { codes: codes, hours: total };
  }

  public getAllShiftHours():number {
    let work_hours = this.getNormalHours();
    let other_hours = this.getSpecialHours();
    return work_hours + other_hours.hours;
  }

  public getShiftHours() {
    return this.getNormalHours();
  }

  public setShiftHours(hours:number) {
    this.shift_hours = hours;
  }

  public getShiftStatus(colors?:boolean) {
    if(colors !== undefined && colors === false) {
      return "noColors";
    }
    let hours = this.getNormalHours(); // Total work report hours
    let total = this.getShiftLength(); // worksite shift hours
    let status = this.getShiftReportsStatus();
    let date = this.getShiftDate().format("YYYY-MM-DD");
    let now = moment().format("YYYY-MM-DD");
    let retVal;
    if(date > now) {
      retVal = "hoursFuture";
    } else if(status.code === 'S') {
      retVal = "standby";
    } else if(status.code === 'T') {
      retVal = "training";
    } else if(status.code === 'Q') {
      retVal = "travel";
    } else if(status.code === 'M') {
      retVal = "trng-trvl";
    } else if(status.code === 'H') {
      retVal = "holiday";
    } else if(status.code === 'E') {
      retVal = "sick";
    } else if(total === 'OFF' || total === 'off') {
      retVal ="off";
    // } else if(status.status && !status.workHours) {
    //   retVal = "hoursComplete";
    } else if(status.status && status.workHours) {
      retVal = "hoursComplete";
    // } else if(typeof total === 'string' && !status.workHours && !status.otherReportHours && isNaN(Number(total))) {
    //   retVal = "hoursUnder";
    // } else if(typeof total === 'string' && status.otherReportHours) {
    //   retVal = "hoursComplete";
    // } else if(typeof total === 'string' && status.workHours && isNaN(Number(total))) {
    //   retVal = "hoursComplete";
    } else if(!status.status) {
      let numericTotal = Number(total);
      if(isNaN(numericTotal)) {
        if(hours) {
          retVal = 'hoursComplete';
        } else {
          retVal = 'hoursUnder'
        }
      } else {
        if(hours > total) {
          retVal = "hoursOver";
        } else if(hours < total) {
          retVal = "hoursUnder";
        } else if(hours == total) {
          retVal = "hoursComplete";
        } else {
          retVal = "hoursUnknown";
        }
      }
    }
    return retVal;
    // return (status && hours === status) ? "hoursComplete" : (status && hours !== status) ? "hoursUnder" : (hours > total) ? "hoursOver" : (hours < total) ? "hoursUnder" : (hours === total) ? "hoursComplete" : "hoursUnknown";
  }

  public getShiftName(fmt?:string) {
    let date = moment(this.getShiftDate());
    let format = fmt || "YYYY-MM-DD";
    let dateString = date.format(fmt);
    return dateString;
  }

  public getFlaggedReports():Array<Report|ReportOther> {
    let out:Array<Report|ReportOther> = [];
    let reports:Report[] = this.getShiftReports();
    let others:ReportOther[] = this.getShiftOtherReports();
    for(let report of reports) {
      if(report.isFlagged()) {
        out.push(report);
      }
    }
    for(let other of others) {
      if(other.isFlagged()) {
        out.push(other);
      }
    }
    return out;
  }

  public setTimesheet(sheet:Timesheet):Timesheet {
    this.timesheet = sheet;
    return this.timesheet;
  }

  public getTimesheet():Timesheet {
    return this.timesheet;
  }

  public toString(translate?: any) {
    let strOut:string = null;
    let start:string = moment(this.start_time).format("MMM DD");
    let weekID = this.getShiftWeekID();
    let weekStart = moment(this.shift_week).format("MMM DD");
    let payrollWeek = "Payroll week";
    if(translate) {
      payrollWeek = translate.instant('payroll_week');
    }
    // strOut = `${start} (${payrollWeek} ${weekStart})`;
    strOut = `${start}`;
    return strOut;
  }

  public getClass():any {
    return Shift;
  }
  public static getClassName():string {
    return 'Shift';
  }
  public getClassName():string {
    return Shift.getClassName();
  }
  public get [Symbol.toStringTag]():string {
    return this.getClassName();
  };
}
