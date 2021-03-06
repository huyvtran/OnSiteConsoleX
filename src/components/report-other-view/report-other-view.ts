import { Subscription                                              } from 'rxjs'                          ;
import { sprintf                                                   } from 'sprintf-js'                    ;
import { Component, OnInit, OnDestroy, NgZone, Input, Output,      } from '@angular/core'                 ;
import { ElementRef, ViewChild, EventEmitter,                      } from '@angular/core'                 ;
import { OptionsComponent                                          } from 'components/options/options'    ;
import { ServerService                                             } from 'providers/server-service'      ;
import { DBService                                                 } from 'providers/db-service'          ;
import { AuthService                                               } from 'providers/auth-service'        ;
import { AlertService                                              } from 'providers/alert-service'       ;
import { OSData                                                    } from 'providers/data-service'        ;
// import { PDFService                                                } from 'providers/pdf-service'         ;
import { NumberService                                             } from 'providers/number-service'      ;
import { Jobsite, Employee, Schedule, Report, Shift, PayrollPeriod } from 'domain/onsitexdomain'          ;
import { ReportOther,                                              } from 'domain/onsitexdomain'          ;
import { Log, moment, Moment, isMoment, oo, _dedupe,               } from 'domain/onsitexdomain'          ;
import { Message, SelectItem, InputTextarea, Dropdown,             } from 'primeng/primeng'               ;
import { NotifyService                                             } from 'providers/notify-service'      ;
import { Command, KeyCommandService                                } from 'providers/key-command-service' ;
import { NullTemplateVisitor } from '@angular/compiler';

// const _dedupe = (array, property?) => {
//   let prop = "fullName";
//   if (property) {
//     prop = property;
//   }
//   return array.filter((obj, pos, arr) => {
//     return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos;
//   });
// }

interface ReportTypeItem {
  name:string;
  value:string;
}

interface TrainingTypeItem {
  name:string;
  value:string;
  hours:number;
}

@Component({
  selector: 'report-other-view',
  templateUrl: 'report-other-view.html',
})
export class ReportOtherViewComponent implements OnInit,OnDestroy {
  @Input('mode')       mode : string = "edit"         ;
  @Input('shift')     shift : Shift                   ;
  @Input('period')   period : PayrollPeriod           ;
  @Input('other')     other : ReportOther             ;
  @Input('others')   others : ReportOther[] = []      ;
  @Input('tech')       tech : Employee                ;
  @Input('site')       site : Jobsite                 ;
  @Input('sites')     sites : Jobsite[] = []          ;
  @Output('cancel') cancel = new EventEmitter<any>();
  @Output('save') save = new EventEmitter<ReportOther>();
  @Output('deleted') deleted = new EventEmitter<ReportOther>();
  @Output('reportChange') reportChange = new EventEmitter<any>();
  
  public visible    : boolean        = true               ;
  public dialogLeft : number         = 250                ;
  public dialogTop  : number         = 100                ;
  public header     : string         = "View Misc Report" ;
  public title      : string         = "View Misc Report" ;
  public keySubscription: Subscription                    ;
  public dateFormat : "excel"|"moment" = "excel"          ;

  public moment                      = moment             ;
  public idx        : number         = 0                  ;
  public count      : number         = 0                  ;
  public report_date: Date                                ;
  public client     : any                                 ;
  public location   : any                                 ;
  public locID      : any                                 ;
  public reportType : any                                 ;
  public trainingType: any                                ;
  public reportTypePlaceholder:string = " "               ;
  public trainingTypePlaceholder:string = " "             ;
  public travelDestinationPlaceholder:string = " "        ;

  public clients     :any[]     = []                      ;
  public locations   :any[]     = []                      ;
  public locIDs      :any[]     = []                      ;
  public reportTypes :any[]     = []                      ;
  public trainingTypes:any[]    = []                      ;
  public repair_hours:number = 0;
  public time_start  :Date           = new Date()         ;
  public time_end    :Date           = new Date()         ;
  public selectedSite:Jobsite                             ;
  public siteList    :SelectItem[]   = []                 ;
  public clientList  :SelectItem[]   = []                 ;
  public locationList:SelectItem[]   = []                 ;
  public locIDList   :SelectItem[]   = []                 ;
  public timeList    :SelectItem[]   = []                 ;
  public typeList    :SelectItem[]   = []                 ;
  public trainingTypeList:SelectItem[]   = []                 ;
  public unassigned  :Jobsite                             ;
  public oldComponent:any                                 ;
  public reportUndo  :any[]     = []                      ;
  public dropdownScroll : string     = "200px"            ;
  public dataReady   :boolean        = false              ;

  constructor(
    public db         : DBService         ,
    public server     : ServerService     ,
    public alert      : AlertService      ,
    public data       : OSData            ,
    public notify     : NotifyService     ,
    public keyService : KeyCommandService ,
    public numServ    : NumberService     ,
  ) {
    window['reportviewcomponent' ] = this;
    // window['reportviewcomponent2'] = this;
    window['_dedupe'] = _dedupe;
    this.oldComponent = window['p'];
    window['p'] = this;
  }

  ngOnInit() {
    Log.l("ReportViewComponent: ngOnInit() called");
    this.keySubscription = this.keyService.commands.subscribe((command:Command) => {
      switch(command.name) {
        case "ReportView.previous" : this.previous(); break;
        case "ReportView.next"     : this.next(); break;
        case "ReportView.previous" : this.previous(); break;
        case "ReportView.next"     : this.next(); break;
      }
    });

    if(this.data.isAppReady()) {
      let backupReport = oo.clone(this.other);
      this.reportUndo.push(backupReport);
      this.runWhenReady();
    }
  }

  ngOnDestroy() {
    Log.l("ReportViewComponent: ngOnDestroy() fired.");
    if(this.keySubscription) {
      this.keySubscription.unsubscribe();
    }
    window['p'] = this.oldComponent;
  }

  public runWhenReady() {
    this.clients   = _dedupe(this.sites.map((a:Jobsite) => a.client));
    this.locations = _dedupe(this.sites.map((a:Jobsite) => a.location));
    this.locIDs    = _dedupe(this.sites.map((a:Jobsite) => a.locID));
    this.idx = this.others.indexOf(this.other);
    this.count = this.others.length;
    let site = this.getReportLocation();
    this.site = site;
    this.unassigned = this.sites.find((a:Jobsite) => {
      return a.site_number == 1;
    });
    let other = this.other;
    let allReportTypes:ReportTypeItem[] = this.data.getConfigData('report_types');
    this.reportTypes = allReportTypes.filter(a => {
      return a.name !== 'work_report' && a.name !== 'logistics' && a.name !== 'office';
    });
    let allTrainingTypes:TrainingTypeItem[] = this.data.getConfigData('training_types');
    this.trainingTypes = allTrainingTypes.filter(a => {
      return true;
    });

    this.createMenuLists();
    this.updateDisplay(other);

    this.dataReady = true;
  }

  public createMenuLists() {
    let rpt:ReportOther = this.other;
    let rd = rpt.report_date;
    let reportDate = moment(rpt.report_date, "YYYY-MM-DD").startOf('day');
    let timeList:SelectItem[] = [];
    for(let i = 0; i < 24; i++) {
      for(let j = 0; j < 60; j += 30) {
        let time = sprintf("%02d:%02d", i, j);
        let dateTime:Moment = moment(reportDate).hour(i).minute(j);
        let item:SelectItem = {label: time, value: dateTime};
        timeList.push(item);
      }
    }

    let clientList  : SelectItem[] = [] ;
    let locationList: SelectItem[] = [] ;
    let locIDList   : SelectItem[] = [] ;
    let siteList    : SelectItem[] = [] ;
    let typeList    : SelectItem[] = [] ;
    let trainingTypeList:SelectItem[] = [] ;
    for(let val of this.clients) {
      let item:SelectItem = {label: val.fullName, value: val}
      clientList.push(item);
    }
    for(let val of this.locations) {
      let item:SelectItem = {label: val.fullName, value: val}
      locationList.push(item);
    }
    for(let val of this.locIDs) {
      let item:SelectItem = {label: val.fullName, value: val}
      locIDList.push(item);
    }
    for(let site of this.sites) {
      let item:SelectItem = { label: site.getSiteSelectName(), value: site };
      siteList.push(item);
    }
    for(let type of this.reportTypes) {
      let item:SelectItem = { label: type.value, value: type };
      typeList.push(item);
    }
    for(let type of this.trainingTypes) {
      let item:SelectItem = { label: type.value, value: type };
      trainingTypeList.push(item);
    }
    this.timeList     = timeList     ;
    this.clientList   = clientList   ;
    this.locationList = locationList ;
    this.locIDList    = locIDList    ;
    this.siteList     = siteList     ;
    this.typeList     = typeList     ;
    this.trainingTypeList = trainingTypeList;
  }

  public updateDisplay(other?:ReportOther) {
    let rpt:ReportOther = other || this.other;
    let reportDate = moment(rpt.report_date, "YYYY-MM-DD");
    // this.repair_hours = repair_hours;
    // let startItem:SelectItem = this.timeList.find((a:SelectItem) => {
    //   let time = moment(a.value);
    //   return time.isSame(time_start);
    // });
    // let endItem:SelectItem = this.timeList.find((a:SelectItem) => {
    //   let time = moment(a.value);
    //   return time.isSame(time_end);
    // });
    // this.time_start = startItem.value.toDate();
    // this.time_end = endItem.value.toDate();


    let name  = rpt.username;
    let index = this.others.indexOf(rpt) + 1;
    let count = this.others.length;
    let report_date = moment(rpt.report_date).toDate();
    this.report_date = report_date;
    let client = this.data.getFullClient(rpt.client);
    let location = this.data.getFullLocation(rpt.location);
    let locID = this.data.getFullLocID(rpt.location_id);
    let rptType = rpt.type.toLowerCase();
    let selClient = this.clientList.find((a:SelectItem) => {
      return a.value.name === client.name;
    });
    let selLocation = this.locationList.find((a:SelectItem) => {
      return a.value.name === location.name;
    });
    let selLocID = this.locIDList.find((a:SelectItem) => {
      return a.value.name === locID.name;
    });
    let selType = this.typeList.find((a:SelectItem) => {
      let type = a.value;
      let name  = type.name.toLowerCase();
      let value = type.value.toLowerCase();
      return rptType === name || rptType === value;
    });
    this.client = selClient ? selClient.value : this.unassigned.client;
    this.location = selLocation ? selLocation.value : this.unassigned.location;
    this.locID = selLocID ? selLocID.value : this.unassigned.locID;
    this.reportType = selType ? selType.value : null;
    this.trainingType = null;
    this.selectedSite = null;
    if(rpt.travel_location) {
      let site = this.sites.find(a => {
        let siteName = a.getSiteSelectName();
        return rpt.travel_location.toUpperCase() === siteName;
      });
      if(site) {
        this.selectedSite = site;
      }
    }
    if(rpt.training_type) {
      let trnType = rpt.training_type.toLowerCase();
      let selTrainingType = this.trainingTypeList.find((a:SelectItem) => {
        let type = a.value;
        let name  = type.name.toLowerCase();
        let value = type.value.toLowerCase();
        return trnType === name || trnType === value;
      });
      this.trainingType = selTrainingType ? selTrainingType.value : null;
    }

    let idx = this.others.indexOf(rpt);
    let num = idx + 1;
    let len = this.others.length;
    let title = `View Misc Report (${num} / ${len})`;
    this.header = title;
  }

  public getReportOtherType(other:ReportOther):string {
    if(other instanceof ReportOther) {
      let type = typeof other.type === 'string' ? other.type.toLowerCase() : "";
      return type;
    }
  }

  public updateSite(site:Jobsite, evt?:Event) {
    // let client   = site.client;
    // let location = site.location;
    // let locID    = site.locID;
    Log.l(`ReportOtherView.updateSite(): Called with site:`, site);
    this.other.setSite(site);
  }

  public updateTravelDestination(site:Jobsite, evt?:Event) {
    Log.l(`ReportOtherView.updateTravelDestination(): Called with site:`, site);
    this.other.setTravelDestination(site);
  }

  public updateReportType(reportType:ReportTypeItem, other:ReportOther, event?:Event) {
    if(other instanceof ReportOther && typeof reportType.value === 'string') {
      // other.type = reportType.name;
      other.type = reportType.value;
    }
  }

  public updateTrainingType(trainingType:TrainingTypeItem, other:ReportOther, event?:Event) {
    if(other instanceof ReportOther && typeof trainingType.value === 'string') {
      // other.type = reportType.name;
      other.training_type = trainingType.name;
      other.time = trainingType.hours;
    }
  }

  // public cancel(event?:any) {
  //   // this.viewCtrl.dismiss();
  //   Log.l("cancel(): Clicked, event is:\n", event);
  //   this.finished.emit(event);
  // }

  public async saveNoExit():Promise<any> {
    try {
      let res = await this.db.saveOtherReport(this.other);
      Log.l("saveNoExit(): Report successfully saved.");
      if(res.rev) {
        this.other._rev = res.rev;
      }
      // if(this.period) {
      //   this.period.addReportOther(this.other);
      // } else if(this.shift) {
      //   this.shift.addOtherReport(this.other);
      // }
      this.reportChange.emit();
    } catch(err) {
      Log.l(`ReportOtherView.saveNoExit(): Error saving report`);
      Log.e(err);
      // this.alert.showAlert("ERROR", "Error saving report:<br>\n<br>\n" + err.message);
      // this.notify.addError("ERROR", `Error saving report: '${err.message}'`, 10000);
      await this.alert.showErrorMessage("ERROR", `Error saving misc. report`, err);
    }
  }

  public async saveClicked(event?:any):Promise<any> {
    try {
      let res = await this.db.saveOtherReport(this.other);
      if(res.rev) {
        this.other._rev = res.rev;
      }
      Log.l("ReportOtherView.saveClicked(): Report successfully saved.");
      // if(this.period) {
      //   this.period.addReportOther(this.other);
      // } else if(this.shift) {
      //   this.shift.addOtherReport(this.other);
      // }
      // this.viewCtrl.dismiss();
      // this.finished.emit(event);
      this.save.emit(this.other);
    } catch(err) {
      Log.l("ReportOtherView.saveClicked(): Error saving report.");
      Log.e(err);
      // this.notify.addError("ERROR", `Error saving report: '${err.message}'`, 1000);
      await this.alert.showErrorMessage("ERROR", `Error saving misc. report`, err);
    }
  }

  public async deleteReport(event:MouseEvent) {
    let report = this.other;
    Log.l(`ReportOtherView.deleteReport(): Called with event:`, event);
    try {
      let confirm:boolean;
      if(!(event && (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey))) {
        confirm = await this.alert.showConfirmYesNo("DELETE MISC REPORT", "Really delete this report? This cannot be undone.");
      } else {
        confirm = true;
      }
      if(confirm) {
        let res = await this.db.deleteOtherReport(report);
        Log.l("ReportOtherView.deleteReport(): Successfully deleted report.");
        let idx = this.others.indexOf(report);
        if(idx > -1) {
          this.others.splice(idx, 1);
        }
        this.deleted.emit(report);
        this.cancel.emit(event);
      }
    } catch(err) {
      Log.l(`ReportOtherView.deleteReport(): Error deleting report`);
      Log.e(err);
      // this.notify.addError("ERROR", `Error deleting ReportOther '${report._id}': '${err.message}'`, 10000);
      await this.alert.showErrorMessage("ERROR", `Error deleting misc. report`, err);
    }
  }

  public updateDate(newDate:Date) {
    Log.l(`ReportOtherView.updateDate(): Called with date:`, newDate);
    let date:Moment = moment(newDate);
    let report:ReportOther = this.other;
    // report.report_date = moment(date);
    report.setReportDate(date);
    report.shift_serial = Shift.getShiftSerial(date);
    report.payroll_period = PayrollPeriod.getPayrollSerial(date);
  }

  public setReportLocation(site:Jobsite) {
    let tech = this.tech;
    // let report = this.other;
    // let cli = this.data.getFullClient(tech.client);
    // let loc = this.data.getFullLocation(tech.location);
    // let lid = this.data.getFullLocation(tech.locID);
    let cli = site.client;
    let loc = site.location;
    let lid = site.locID;
    this.updateReportCLL('client', cli);
    this.updateReportCLL('location', loc);
    this.updateReportCLL('locID', lid);
    this.client = this.clients.find(a => {
      return a['name'] === cli.name;
    });
    this.location = this.locations.find(a => {
      return a['name'] === loc.name;
    });
    this.locID = this.locIDs.find(a => {
      return a['name'] === lid.name;
    });
    // this.updateReportCLL('client', client);
    // this.updateReportCLL('location', location);
    // this.updateReportCLL('locID', locID);
    // this.site = site;
    // return this.site;
    return this.other;
  }

  public getReportLocation() {
    let rpt = this.other;
    let cli  = this.data.getFullClient(rpt.client);
    let loc  = this.data.getFullLocation(rpt.location);
    let lid  = this.data.getFullLocID(rpt.location_id);
    let site = this.sites.find((a:Jobsite) => {
      let siteClient   = a.client.name;
      let siteLocation = a.location.name;
      let siteLocID    = a.locID.name;
      return siteClient === cli.name && siteLocation === loc.name && siteLocID === lid.name;
    });
    Log.l(`getReportLocation(): Report/tech located at site:\n`, site);
    return site;
  }

  public updateReportCLL(key:string, value:any) {
    let report = this.other;
    Log.l(`updateReportCLL(): Setting report key ${key} to:\n`, value);
    if(key === 'client') {
      report.client = value.fullName;
    } else if(key === 'location') {
      report.location = value.fullName;
    } else if(key === 'locID') {
      report.location_id = value.name;
    } else {
      Log.w(`updateReportCLL(): Unable to find key ${key} to set, in ReportOther:\n`, report);
    }  }

  public updateRepairHours() {
    let report = this.other;
    // report.setRepairHours(Number(this.other.repair_hours));
    // this.time_start = moment(report.time_start);
    // this.time_end = moment(report.time_end);
    this.updateDisplay();
  }

  public updateTimeStart() {
    let report = this.other;
    let start = moment(this.time_start);
    // report.setStartTime(start);
    this.updateDisplay();
  }

  public updateTimeEnd() {
    let report = this.other;
    let end = moment(this.time_end);
    // report.setEndTime(end);
    this.updateDisplay();
  }

  public previous() {
    this.idx--;
    if(this.idx < 0) {
      this.idx = 0;
    }
    this.other = this.others[this.idx];
    this.reportChange.emit(this.idx);
    this.updateDisplay();
  }

  public next() {
    this.idx++;
    if(this.idx >= this.count) {
      this.idx = this.count - 1;
    }
    this.other = this.others[this.idx];
    this.reportChange.emit(this.idx);
    this.updateDisplay();

  }

  public toggleDateFormat() {
    if(this.dateFormat==='excel') {
      this.dateFormat = 'moment';
    } else {
      this.dateFormat = 'excel';
    }
  }

  public async cancelClicked(event?:Event):Promise<any> {
    // this.viewCtrl.dismiss();
    Log.l("cancelClicked(): Clicked, event is:", event);
    this.cancel.emit(event);
    // this.finished.emit(event);
  }

  // public splitReport(event?:any) {
  //   let report = this.other;
  //   let idx = this.others.indexOf(report);
  //   let rpt1:ReportOther = this.others.splice(idx, 1)[0];
  //   let tech:Employee = this.employee;
  //   this.others.push(rpt1);
  //   let reportDoc = report.serialize();
  //   // let newReport = new Report();
  //   // newReport.readFromDoc(reportDoc);
  //   let newReport = this.data.splitReport(report);
  //   report.split_count++;
  //   newReport.split_count++;
  //   newReport._rev = "";
  //   let start = moment(report.time_start);
  //   let hours = report.getRepairHours();
  //   let splitHours1 = hours / 2;
  //   let splitHours2 = hours / 2;
  //   let splitMinutes1 = splitHours1 * 60;
  //   let splitMinutes2 = splitHours2 * 60;
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
  //   this.others.push(newReport);
  //   this.other = newReport;
  //   this.count = this.others.length;
  //   this.idx = this.count - 1;
  //   this.reportChange.emit(this.idx);
  // }

//   public
// }

}
