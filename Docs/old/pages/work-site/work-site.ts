// import { GoogleMapsAPIWrapper                                        } from '@agm/core'                     ;
import 'rxjs/add/operator/debounceTime';
import { sprintf                                                     } from 'sprintf-js'                    ;
import { Subscription                                                } from 'rxjs'                          ;
import { Component, OnInit, OnDestroy, NgZone, ViewChild, ElementRef } from '@angular/core'                 ;
import { IonicPage, NavController, NavParams                         } from 'ionic-angular'                 ;
import { ViewController, ModalController, PopoverController          } from 'ionic-angular'                 ;
import { Log, moment, Moment, isMoment, oo, _dedupe,                 } from 'domain/onsitexdomain'          ;
import { SESACLL, SESAClient, SESALocation, SESALocID,               } from 'domain/onsitexdomain'          ;
import { Preferences                                                 } from 'providers/preferences'         ;
import { OSData                                                      } from 'providers/data-service'        ;
import { AuthService                                                 } from 'providers/auth-service'        ;
import { DBService                                                   } from 'providers/db-service'          ;
import { ServerService                                               } from 'providers/server-service'      ;
import { AlertService                                                } from 'providers/alert-service'       ;
import { ScriptService                                               } from 'providers/script-service'      ;
import { Street, Address, Jobsite,                                   } from 'domain/onsitexdomain'          ;
import { OnSiteGeolocation, ILatLng, LatLng,                         } from 'domain/onsitexdomain'          ;
import { Command, KeyCommandService                                  } from 'providers/key-command-service' ;
import { NotifyService                                               } from 'providers/notify-service'      ;
// import { OverlayPanel                                                } from 'primeng/overlaypanel'          ;
import { SelectItem                                                  } from 'primeng/api'                   ;
import { Dialog                                                      } from 'primeng/dialog'                ;
// import { Checkbox,                                                   } from 'primeng/checkbox'              ;
import { GMap                                                        } from 'primeng/gmap'                  ;

declare const google:any;

@IonicPage({ name: "Work Site" })
@Component({
  selector: 'page-work-site',
  templateUrl: 'work-site.html'
})

export class WorkSitePage implements OnInit,OnDestroy {
  @ViewChild('hoursDialog') hoursDialog:Dialog;
  // @ViewChild('hoursOverlay') hoursOverlay:OverlayPanel;
  @ViewChild('workSiteHours') workSiteHours:ElementRef;
  @ViewChild('overlayTarget') overlayTarget:ElementRef;
  @ViewChild('googleMapComponent') googleMapComponent:GMap;
  public title          : string         = "Work Site"         ;
  // public static    PREFS: any            = new Preferences()   ;
  public keySubscription: Subscription                         ;
  public jobsite        : Jobsite                              ;
  public sites          : Array<Jobsite> = []                  ;
  public newSite        : Jobsite                              ;
  public siteIndex      : number         = 0                   ;
  public siteCount      : number         = 0                   ;
  public modal          : boolean        = false               ;
  public mode           : string         = 'Add'               ;
  public source         : string         = ''                  ;
  public client         : any                                  ;
  public location       : any                                  ;
  public locID          : any                                  ;
  public clientList     : Array<any>     = []                  ;
  public locationList   : Array<any>     = []                  ;
  public locIDList      : Array<any>     = []                  ;
  public clientMenu     : SelectItem[]   = []                  ;
  public locationMenu   : SelectItem[]   = []                  ;
  public locIDMenu      : SelectItem[]   = []                  ;
  public accountMenu    : SelectItem[]   = []                  ;
  public rotations      : Array<any>     = []                  ;
  public techShifts     : Array<any>     = []                  ;
  public siteLat        : number         = 26.177260           ;
  public siteLon        : number         = -97.964594          ;
  // public siteRadius     : number         = 500                 ;
  public lat            : number         = 26.177260           ;
  public lon            : number         = -97.964594          ;
  public mapMode        : string         = "hybrid"            ;
  public mapZoom        : number         = 16                  ;
  public radiusColor    : string         = "rgba(255,0,0,0.5)" ;
  public tmpColor       : string         = "rgba(0,255,0,0.5)" ;
  public tmpStrokeColor : string         = "rgba(0,255,0,0.8)" ;
  public tooltipPosition:string          = "left"              ;
  public tooltipDelay   :number          = 500                 ;
  public hoursDialogVisible:boolean      = false               ;
  public hoursClosable  :boolean         = false               ;
  public hoursModalMode :boolean         = false               ;
  public dropdownHeight :string          = "200px"             ;
  public cancelEdit     : boolean        = false               ;
  public addSiteLocaleVisible:boolean    = false               ;
  public addSiteLocaleType:string        = 'client'            ;
  public gmapOptions    : any                                  ;
  public gmapOverlays   : any[]          = []                  ;
  // public mapUpdateDelay : number         = 750                 ;
  public mapUpdateDelay : number         = 400                 ;
  public googleMapVisible          : boolean       = true      ;

  public shiftStartTimes           : any                       ;
  public startOptions              : Array<string> = []        ;
  public startOptionsAM            : Array<string> = []        ;
  public startOptionsPM            : Array<string> = []        ;
  public startAM                   : string        = ""        ;
  public startPM                   : string        = ""        ;
  public timeAM                    : string        = ""        ;
  public timePM                    : string        = ""        ;

  // public addClient   : SESAClient   = new SESAClient(  { name: "__", fullName: "Add new client"      , code: "__", value: "Add new client"      , capsName: "ADD NEW CLIENT"      , scheduleName: "Add new client"      ,});
  // public addLocation : SESALocation = new SESALocation({ name: "__", fullName: "Add new location"    , code: "__", value: "Add new location"    , capsName: "ADD NEW LOCATION"    , scheduleName: "Add new location"    ,});
  // public addLocID    : SESALocID    = new SESALocID(   { name: "__", fullName: "Add new location ID" , code: "__", value: "Add new location ID" , capsName: "ADD NEW LOCATION ID" , scheduleName: "Add new location ID" ,});
  // public addLoc2nd                  : any     = {name:"__", fullName:"Add new secondary location"} ;
  public modalMode: boolean = false;
  public dataReady: boolean = false;


  // public get prefs(): any { return WorkSitePage.PREFS; };

  constructor(
    public navCtrl    : NavController        ,
    public navParams  : NavParams            ,
    public viewCtrl   : ViewController       ,
    public modalCtrl  : ModalController      ,
    public zone       : NgZone               ,
    public prefs      : Preferences          ,
    public scripts    : ScriptService        ,
    public db         : DBService            ,
    public server     : ServerService        ,
    public alert      : AlertService         ,
    public auth       : AuthService          ,
    public data       : OSData               ,
    public keyService : KeyCommandService    ,
    public notify     : NotifyService        ,
  ) {
    window['onsiteworksite']  = this;
    window['onsiteworksite2'] = this;
    window['p'] = this;
    window['_dedupe'] = _dedupe;
  }

  public ngOnInit() {
    Log.l("WorkSitePage: ngOnInit() fired");
    if(this.data.isAppReady()) {
      this.runWhenReady();
    };
  }

  public ngOnDestroy() {
    Log.l("WorkSitePage: ngOnDestroy() fired");
    this.cancelSubscriptions();
  }

  public async loadGoogleMapsScript():Promise<any> {
    try {
      Log.l(`loadGoogleMapsScript(): Starting`)
      let key:string = "maps";
      let res:any = await this.scripts.loadScript(key);
      if(res && res.loaded) {
        Log.l(`loadGoogleMapsScript(): Returning in a good way`)
        return res;
      }
      Log.l(`loadGoogleMapsScript(): Returning in a bad way`)
    } catch(err) {
      Log.l(`loadGoogleMapsScript(): Error loading script!`);
      Log.e(err);
      throw err;
    }
  }

  public async runWhenReady() {
    try {
      this.initializeSubscribers();
      if(this.navParams.get('modalMode') != undefined) { this.modalMode = this.navParams.get('modalMode'); }
      if(this.navParams.get('modal') != undefined) { this.modal = this.navParams.get('modal'); };
      if(this.navParams.get('mode') != undefined) { this.mode = this.navParams.get('mode'); } else { this.mode = "Add" };
      if(this.navParams.get('source') != undefined) { this.source = this.navParams.get('source'); } else { this.source = "worksites" };
      if(this.navParams.get('sites') != undefined) { this.sites = this.navParams.get('sites'); } else { this.sites = this.data.getData('sites'); }
      this.title = `${this.mode} Job Site`;
      if(this.navParams.get('jobsite') != undefined) {
        this.jobsite = this.navParams.get('jobsite');
        this.siteIndex = this.sites.indexOf(this.jobsite) + 1;
        this.siteCount = this.sites.length;
        // this.siteLat = this.jobsite.latitude;
        // this.siteLon = this.jobsite.longitude;
        // this.siteRadius = this.jobsite.within;
      } else {
        this.jobsite = new Jobsite();
        this.sites.push(this.jobsite);
        this.newSite = this.jobsite;
        this.siteIndex = this.sites.length;
        let sortedSites = this.sites.sort((a:Jobsite, b:Jobsite) => {
          let sA = a.site_number;
          let sB = b.site_number;
          return sA > sB ? 1 : sA < sB ? -1 : 0;
        });
        let siteNumber = sortedSites[sortedSites.length - 1].site_number;
        siteNumber++;
        this.jobsite.setSiteNumber(siteNumber);
        this.siteCount = this.sites.length;
      }
      Log.l(`Mode is '${this.mode}' and jobsite is:\n`, this.jobsite);

      for(let i = 0; i < 24; i++) {
        for(let j = 0; j < 60; j += 30) {
          let time = sprintf("%02d:%02d", i, j);
          this.startOptions.push(time);
          this.startOptionsAM.push(time);
          this.startOptionsPM.push(time);
        }
      }
      if(this.jobsite) {
        let times = this.jobsite.getShiftStartTimes();
        this.shiftStartTimes = times;
        this.startAM = times.AM;
        this.startPM = times.PM;
      }
      // this.server.getClients().then((res:Array<any>) => {
      //   Log.l("WorkSite: got client data:\n", res);
      //   this.clientList = res;
      //   this.clientList.push(this.addClient);
      //   return this.server.getLocations();
      // }).then((res:Array<any>) => {
      //   Log.l("WorkSite: got location data:\n", res);
      //   this.locationList = res;
      //   this.locationList.push(this.addLocation);
      //   return this.server.getLocIDs();
      // }).then((res:Array<any>) => {
      //   Log.l("WorkSite: got locID data:\n", res);
      //   this.locIDList = res;
      //   this.locIDList.push(this.addLocID);
      //   // return this.server.getLoc2nds();
      //   // }).then((res) => {
      //   // Log.l("WorkSite: got loc2nd data:\n", res);
      //   // this.loc2ndList = res;
      //   // this.loc2ndList.push(this.addLoc2nd);
      //   return this.server.getShiftRotations();
      // }).then((res:Array<any>) => {
      //   Log.l("WorkSite: got shift rotation data:\n", res);
      //   this.rotations = res;
      //   let rotnames = Object.keys(this.jobsite.shiftRotations);
      //   if(!rotnames.length) {
      //     this.jobsite.shiftRotations = this.rotations;
      //   }
      //   return this.server.getTechShifts();

      let res:any = await this.getConfigData();
      Log.l("WorkSite: got tech shift data:\n", res);
      this.techShifts = res;
      let shiftNames = Object.keys(this.jobsite.techShifts);
      if(!shiftNames.length) {
        this.jobsite.techShifts = this.techShifts;
      }
      Log.l("WorkSite: all data ready, Jobsite is:\n", this.jobsite);
      this.initializeDropdownOptions();
      this.initializeForm();
      // this.createGoogleMapsOverlays();
      // this.updateForm();
      res = await this.loadGoogleMapsScript();
      this.dataReady = true;
      Log.l(`WorkSitePage.runWhenReady(): About to await updateOverlays ...`);
      res = await this.updateOverlays();
      Log.l(`WorkSitePage.runWhenReady(): Done with that, now about to setTimeout`);
      setTimeout(() => {
        let out:any = this.addGoogleMapListener();
        this.setPageLoaded();
        Log.l(`WorkSitePage.runWhenReady(): Done with all timeouts and stuff!`);
      }, this.mapUpdateDelay);
      Log.l(`WorkSitePage.runWhenReady(): Returning...`);
      return res;
    } catch(err) {
      Log.l(`WorkSitePage.runWhenReady(): Error during initialization!`);
      Log.e(err);
      this.setPageLoaded();
      // throw err;
    }
    // }).catch((err) => {
    //   Log.l("WorkSite: error getting data!");
    //   Log.e(err);
    // });
  }

  public initializeSubscribers() {
    this.keySubscription = this.keyService.commands.subscribe((command: Command) => {
      switch(command.name) {
        case "WorkSitePage.saveNoExit"  : this.saveNoExit(); break;
        case "WorkSitePage.sitePrevious": this.sitePrevious(); break;
        case "WorkSitePage.siteNext"    : this.siteNext(); break;
        case "WorkSitePage.onSubmit"    : this.onSubmit(); break;
      }
    });
  }

  public cancelSubscriptions() {
    if(this.keySubscription && this.keySubscription.unsubscribe) {
      this.keySubscription.unsubscribe();
    }
  }

  public setPageLoaded() {
    Log.l(`setPageLoaded(): Now setting page loaded ...`);
    this.data.currentlyOpeningPage = false;
  }

  public closeModal(evt?:any) {
    this.viewCtrl.dismiss();
  }

  public initializeDropdownOptions() {
    Log.l("initializeDropdownOptions(): Now running...");
    // let sites = this.sites;
    // let site = this.jobsite;
    // let clientList    = _dedupe(sites.map((a:Jobsite) => a.client));
    // let locationList  = _dedupe(sites.map((a:Jobsite) => a.location));
    // let locIDList     = _dedupe(sites.map((a:Jobsite) => a.locID));

    // this.clientList   = clientList;
    // this.locationList = locationList;
    // this.locIDList    = locIDList;
  }

  public initializeForm() {
    Log.l("initializeForm(): Now running...");
    let site = this.jobsite;
    let clientMenu:SelectItem[]   = [];
    let locationMenu:SelectItem[] = [];
    let locIDMenu:SelectItem[]    = [];
    for(let client of this.clientList) {
      let item:SelectItem = {label: client.fullName, value: client};
      clientMenu.push(item);
    }
    for(let location of this.locationList) {
      let item:SelectItem = {label: location.fullName, value: location};
      locationMenu.push(item);
    }
    for(let locID of this.locIDList) {
      let item:SelectItem = {label: locID.fullName, value: locID};
      locIDMenu.push(item);
    }
    let accountMenu:SelectItem[]  = [
      {label: "Contract", value: "Contract" },
      {label: "Account" , value: "Account"  },
    ];

    let cli = site.client.code.toUpperCase();
    let loc = site.location.code.toUpperCase();
    let lid = site.locID.code.toUpperCase();
    Log.l(`initializeForm(): Now loading site ${cli}, ${loc}, ${lid} ...`);
    let client, location, locID;
    let clientEntry = clientMenu.find((a:SelectItem) => {
      return cli === a.value.code.toUpperCase();
    });
    if(clientEntry && clientEntry.value) {
      client = clientEntry.value;
    }
    let locationEntry = locationMenu.find((a:SelectItem) => {
      return loc === a.value.code.toUpperCase();
    });
    if(locationEntry && locationEntry.value) {
      location = locationEntry.value;
    }
    let locIDEntry = locIDMenu.find((a:SelectItem) => {
      return lid === a.value.code.toUpperCase();
    });
    if(locIDEntry && locIDEntry.value) {
      locID = locIDEntry.value;
    }

    this.clientMenu   = clientMenu;
    this.locationMenu = locationMenu;
    this.locIDMenu    = locIDMenu;
    this.accountMenu  = accountMenu;

    this.client   = client;
    this.location = location;
    this.locID    = locID;
  }

  public async getConfigData() {
    try {
      let res:any = await this.db.getClients();
      Log.l("getConfigData(): got client data:\n", res);
      this.clientList = res;
        // this.clientList.push(this.addClient);
      res = await this.db.getLocations();
      Log.l("getConfigData(): got location data:\n", res);
      this.locationList = res;
      // this.locationList.push(this.addLocation);
      res = await this.db.getLocIDs();
      Log.l("getConfigData(): got locID data:\n", res);
      this.locIDList = res;
        // this.locIDList.push(this.addLocID);
        // return this.server.getLoc2nds();
        // }).then((res) => {
        // Log.l("WorkSite: got loc2nd data:\n", res);
        // this.loc2ndList = res;
        // this.loc2ndList.push(this.addLoc2nd);
      res = await this.server.getShiftRotations();
      Log.l("getConfigData(): got shift rotation data:\n", res);
      this.rotations = res;
        // let rotnames = Object.keys(this.jobsite.shiftRotations);
        // if(!rotnames.length) {
        //   this.jobsite.shiftRotations = this.rotations;
        // }
      res = await this.server.getTechShifts();
      Log.l("getConfigData(): got tech shift data:\n", res);
      this.techShifts = res;
        // let shiftNames = Object.keys(this.jobsite.techShifts);
        // if(!shiftNames.length) {
        //   this.jobsite.techShifts = this.techShifts;
        // }
      return res;
    } catch(err) {
      Log.l(`getConfigData(): Error getting client, location, locID, or whatever!`);
      Log.e(err);
      throw err;
    }
  }

  public async addJobSite(evt?:any) {
    try {
      this.dataReady = false;
      this.mode = 'Add';
      let cli:SESAClient   = new SESAClient()  ;
      let loc:SESALocation = new SESALocation();
      let locID = {
        "capsName" : "MAINTENANCE SHOP",
        "code"     : "MNSHOP"          ,
        "fullName" : "Maintenance Shop",
        "value"    : "Maintenance Shop",
        "name"     : "MNSHOP"          ,
        "techClass": "M-TECH"          ,
        "id"       : 87                ,
      };
      let lid:SESALocID    = new SESALocID(locID)   ;
      // let jobsite = new Jobsite(cli, loc, lid, new Address(new Street('', ''), '', '', ''), 26.177260, -97.964594, 500);
      let jobsite:Jobsite = new Jobsite();
      jobsite.client = cli;
      jobsite.location = loc;
      jobsite.locID = lid;
      let sortedSites = this.sites.sort((a:Jobsite, b:Jobsite) => {
        let sA = a.site_number;
        let sB = b.site_number;
        return sA > sB ? 1 : sA < sB ? -1 : 0;
      });
      let siteNumber = sortedSites[sortedSites.length - 1].site_number;
      siteNumber++;
      jobsite.setSiteNumber(siteNumber);
      sortedSites = this.sites.sort((a: Jobsite, b: Jobsite) => {
        let sA = a.sort_number;
        let sB = b.sort_number;
        return sA > sB ? 1 : sA < sB ? -1 : 0;
      });
      let sortNumber = sortedSites[sortedSites.length - 1].sort_number;
      jobsite.sort_number = sortNumber + 1;
      this.sites.push(jobsite);
      this.siteIndex = this.sites.length;
      this.siteCount = this.sites.length;
      let times = jobsite.getShiftStartTimes();
      this.shiftStartTimes = times;
      this.startAM = times.AM;
      this.startPM = times.PM;
      let res:any = await this.getConfigData();
      jobsite.techShifts = this.techShifts;
      jobsite.shiftRotations = this.rotations;
      this.jobsite = jobsite;
      this.initializeDropdownOptions();
      this.initializeForm();
      // this.updateForm();
      this.updateDisplay();
      this.dataReady = true;
      return res;
    } catch(err) {
      Log.l("addJobSite(): Error while adding.");
      Log.e(err);
      this.alert.showAlert("ERROR", "Error adding new job site:<br>\n<br>\n" + err.message);
    }
  }

  public async cloneJobSite(evt?:any) {
    try {
      this.dataReady = false;
      this.mode = 'Add';
      let oldSite:Jobsite = this.jobsite;
      let bkSite:Jobsite = this.jobsite.clone();
      let newSite:Jobsite = this.jobsite.clone();
      let cli:SESAClient   = new SESAClient()  ;
      let loc:SESALocation = new SESALocation();
      let locID = {
        "capsName" : "MAINTENANCE SHOP",
        "code"     : "MNSHOP"          ,
        "fullName" : "Maintenance Shop",
        "value"    : "Maintenance Shop",
        "name"     : "MNSHOP"          ,
        "techClass": "M-TECH"          ,
        "id"       : 87                ,
      };
      let lid:SESALocID    = new SESALocID(locID)   ;
      let sortedSites = this.sites.sort((a:Jobsite, b:Jobsite) => {
        let sA = a.site_number;
        let sB = b.site_number;
        return sA > sB ? 1 : sA < sB ? -1 : 0;
      });
      let jobsite:Jobsite = newSite;
      let siteNumber = sortedSites[sortedSites.length - 1].site_number;
      siteNumber++;
      jobsite.setSiteNumber(siteNumber);
      sortedSites = this.sites.sort((a: Jobsite, b: Jobsite) => {
        let sA = a.sort_number;
        let sB = b.sort_number;
        return sA > sB ? 1 : sA < sB ? -1 : 0;
      });
      let sortNumber = sortedSites[sortedSites.length - 1].sort_number;
      jobsite.sort_number = sortNumber + 1;
      this.sites.push(jobsite);
      this.siteIndex = this.sites.length;
      this.siteCount = this.sites.length;
      let times = jobsite.getShiftStartTimes();
      this.shiftStartTimes = times;
      this.startAM = times.AM;
      this.startPM = times.PM;
      let res:any = await this.getConfigData();
      jobsite.techShifts = this.techShifts;
      jobsite.shiftRotations = this.rotations;
      this.jobsite = jobsite;
      this.initializeDropdownOptions();
      this.initializeForm();
      // this.updateForm();
      this.updateDisplay();
      this.dataReady = true;
      return res;
    } catch(err) {
      Log.l("addJobSite(): Error while adding.");
      Log.e(err);
      this.alert.showAlert("ERROR", "Error adding new job site:<br>\n<br>\n" + err.message);
    }
  }

  public updateDisplay() {
    // let f = this.jobSiteForm;
    let a = this.jobsite.address;
    let b = this.jobsite.billing_address;
    let a_s = a.street;
    let b_s = b.street;
    // f.controls.address.setValue();
    // f.controls.billing_address.setValue();
    let client = this.clientList.find(a => {
      return a.code.toUpperCase() === this.jobsite.client.code.toUpperCase();
    });
    let location = this.locationList.find(a => {
      return a.code.toUpperCase() === this.jobsite.location.code.toUpperCase();
    });
    let locID = this.locIDList.find(a => {
      return a.code.toUpperCase() === this.jobsite.locID.code.toUpperCase();
    });

    this.client   = client   ;
    this.location = location ;
    this.locID    = locID    ;
    this.updateLatLon();
    // this.refreshMap();
  }

  // public updateForm() {
  //   let client = this.clientList.find(a => {
  //     return a.code.toUpperCase() === this.jobsite.client.code.toUpperCase();
  //   });
  //   let location = this.locationList.find(a => {
  //     return a.code.toUpperCase() === this.jobsite.location.code.toUpperCase();
  //   });
  //   let locID = this.locIDList.find(a => {
  //     return a.code.toUpperCase() === this.jobsite.locID.code.toUpperCase();
  //   });

  //   this._client = this.jobSiteForm.controls['client'];
  //   this._location = this.jobSiteForm.controls['location'];
  //   this._locID = this.jobSiteForm.controls['locID'];
  //   this._lat = this.jobSiteForm.controls['latitude'];
  //   this._lon = this.jobSiteForm.controls['longitude'];
  //   if(this.mode == 'Add') {
  //     for(let locID of this.locIDList) {
  //       if(locID.code == "MNSHOP") {
  //         this._locID.setValue(locID);
  //         this.jobsite.locID = locID;
  //       }
  //     }
  //   } else {
  //     for(let client of this.clientList) {
  //       if(client.code == this.jobsite.client.code) {
  //         this._client.setValue(client);
  //       }
  //     }
  //     for(let location of this.locationList) {
  //       if(location.code == this.jobsite.location.code) {
  //         this._location.setValue(location);
  //       }
  //     }
  //     for(let locID of this.locIDList) {
  //       if(locID.code == this.jobsite.locID.code) {
  //         this._locID.setValue(locID);
  //       }
  //     }
  //   }
  //   this._client.valueChanges.subscribe((value: any) => {
  //     Log.l("valueChanged for client:\n", value);
  //     if(value) {
  //       this.clientChanged(value);
  //     }
  //   });
  //   this._location.valueChanges.subscribe((value: any) => {
  //     Log.l("valueChanged for location:\n", value);
  //     if(value) {
  //       this.locationChanged(value);
  //     }
  //   });
  //   this._locID.valueChanges.subscribe((value: any) => {
  //     Log.l("valueChanged for locID:\n", value);
  //     if(value) {
  //       this.locIDChanged(value);
  //     }
  //   });

  //   this._lat.valueChanges.debounceTime(300).subscribe((value: any) => {
  //     Log.l("Latitude changed to: ", value);
  //     if(value) {
  //       let lat = Number(value);
  //       if(!isNaN(lat)) { this.jobsite.latitude = lat; }
  //     }
  //   });
  //   this._lon.valueChanges.debounceTime(300).subscribe((value: any) => {
  //     Log.l("Longitude changed to: ", value);
  //     if(value) {
  //       let lon = Number(value);
  //       if(!isNaN(lon)) { this.jobsite.longitude = lon; }
  //     }
  //   });
  // }

  public updateClient(client:any) {
    Log.l("updateClient(): Set to:\n", client);
    if(client.code === '__') {
      this.addNewClient();
    } else {
      this.jobsite.client = client;
    }
    this.jobsite.generateSiteID();
  }

  public updateLocation(location:any) {
    Log.l("updateLocation(): Set to:\n", location);
    if(location.code === '__') {
      this.addNewLocation();
    } else {
      this.jobsite.location = location;
      this.jobsite.address.city = location.fullName;
    }
    this.jobsite.generateSiteID();
  }

  public updateLocID(locID:any) {
    Log.l("updateLocID(): Set to:\n", locID);
    if(locID.code === '__') {
      this.addNewLocID();
    } else {
      this.jobsite.locID = locID;
    }
    this.jobsite.generateSiteID();
  }

  public updateLatLon(evt?:any) {
    Log.l(`updateLatLon(): Event is:\n`, evt);
    let lat = Number(this.jobsite.latitude);
    let lon = Number(this.jobsite.longitude);
    if(!isNaN(lat) && !isNaN(lon)) {
      this.jobsite.latitude = lat;
      this.jobsite.longitude = lon;
      // this.createGoogleMapsOverlays();
      this.updateOverlays();
    }
  }

  public updateRadius(evt?:any) {
    Log.l(`updateRadius(): Event is:\n`, evt);
    // let radius = Number(this.siteRadius);
    let radius = Number(this.jobsite.within);
    if(!isNaN(radius)) {
      this.jobsite.within = radius;
      this.setRadius(radius);
    }
  }

  public addNewLocation() {
    Log.l("addNewLocation(): Called, now adding new location...");
    // let addLocationPage = this.modalCtrl.create('Add New Location', {}, { cssClass: 'add-location-modal' });
    // addLocationPage.onDidDismiss(data => {
    //   Log.l("Got back:\n", data);
    //   if(data) {
    //     let newLocation = data;
    //     this.insertLocation(newLocation);
    //   }
    // });
    // addLocationPage.present();
    this.addSiteLocaleType = 'location';
    this.addSiteLocaleVisible = true;
  }

  public async insertLocation(newLocation: any) {
    // this.locationList.pop();
    this.locationList.push(newLocation);
    // this.locationList.push(this.addLocation);
    this.jobsite.location = newLocation;
    // this.jobSiteForm.controls['location'].setValue(newLocation);
    this.server.saveLocation(newLocation).then((res) => {
      Log.l("insertLocation(): Saved new location successfully!");
    }).catch((err) => {
      Log.l("insertLocation(): Error saving new location!");
      Log.e(err);
    });
  }

  public addNewLocID() {
    Log.l("addNewLocID(): Called, now adding new location...");
    // let addLocIDPage = this.modalCtrl.create('Add New Location ID', {}, { cssClass: 'add-locid-modal' });
    // addLocIDPage.onDidDismiss(data => {
    //   Log.l("Got back:\n", data);
    //   if(data != null) {
    //     let newLocID = data;
    //     this.insertLocID(newLocID);
    //   }
    // });
    // addLocIDPage.present();
    this.addSiteLocaleType = 'locID';
    this.addSiteLocaleVisible = true;
  }

  public insertLocID(newLocID:any) {
    // this.locIDList.pop();
    this.locIDList.push(newLocID);
    // this.locIDList.push(this.addLocation);
    this.jobsite.locID = newLocID;
    // this.jobSiteForm.controls['locID'].setValue(newLocID);
    this.server.saveLocID(newLocID).then((res) => {
      Log.l("insertLocID(): Saved new locID successfully!");
      this.notify.addSuccess("SAVED", `New Tech Class ID created`, 3000);
    }).catch((err) => {
      Log.l("insertLocID(): Error saving new locID!");
      Log.e(err);
      this.notify.addError("ERROR", `Error saving new Tech Class ID: ${err.message}`, 10000);
    });
  }

  public addNewClient() {
    Log.l("addClient(): Called, now adding new client...");
    // let addClientPage = this.modalCtrl.create('Add New Client', {}, { cssClass: 'add-client-modal' });
    // addClientPage.onDidDismiss(data => {
    //   Log.l("Got back:\n", data);
    //   if(data != null) {
    //     let newClient = { name: data.clientAbbreviation, fullName: data.clientName };
    //     this.insertClient(newClient);
    //   }
    // });
    // addClientPage.present();
    this.addSiteLocaleType = 'client';
    this.addSiteLocaleVisible = true;
  }

  public insertClient(newClient: any) {
    // this.clientList.pop();
    this.clientList.push(newClient);
    // this.clientList.push(this.addClient);
    this.jobsite.client = newClient;
    // this.jobSiteForm.controls['client'].setValue(newClient);
    this.server.saveClient(newClient).then((res) => {
      Log.l("insertClient(): Saved new client successfully!");
      this.notify.addSuccess("SAVED", `New client created`, 3000);
    }).catch((err) => {
      Log.l("insertClient(): Error saving new client!");
      Log.e(err);
      this.notify.addError("ERROR", `Error saving new client: ${err.message}`, 10000);
    });
  }

  public saveSite() {
    return new Promise((resolve, reject) => {
      // let siteInfo = this.jobSiteForm.value;
      let siteInfo = this.jobsite;
      // Log.l(siteInfo);
      let client     = siteInfo.client      ;
      let location   = siteInfo.location    ;
      let locID      = siteInfo.locID       ;
      let siteNumber = siteInfo.site_number ;
      let existing = this.sites.filter((a: Jobsite) => {
        return a.client.code === client.code && a.location.code === location.code && a.locID.code === locID.code;
      });
      let locMatches = existing.length;
      let existingNumber = this.sites.filter((a: Jobsite) => {
        return a.site_number === siteNumber;
      });
      let numberMatches = existingNumber.length;
      if(locMatches > 1 && this.mode !== 'Edit') {
        // this.alert.showAlert("DUPLICATION", "There is already a site with that client, location, and location ID!").then(res => {
        reject({ message: `Site already exists for client '${client.fullName}', location '${location.fullName}', locID '${locID.fullName}'.` })
        // });
      } else if(numberMatches > 1 && this.mode !== 'Edit') {
        reject({ message: `Site already exists with number '${siteNumber}'.` })
      } else {
        // for(let prop in siteInfo) {
        //   let val = siteInfo[prop];
        //   Log.l(`saveSite(): Now setting jobsite['${prop}'] to: `, val);
        //   if(prop == 'address') {
        //     this.jobsite.address = new Address(new Street(val.street.street1, val.street.street2), val.city, val.state, val.zip);
        //   } else if(prop == 'billing_address') {
        //     this.jobsite.billing_address = new Address(new Street(val.street.street1, val.street.street2), val.city, val.state, val.zip);
        //   } else {
        //     this.jobsite[prop] = siteInfo[prop];
        //   }
        // }
        let lat = Number(this.jobsite.latitude);
        let lon = Number(this.jobsite.longitude);
        let rad = Number(this.jobsite.within);
        this.jobsite.latitude  = lat ? lat: this.jobsite.latitude  ;
        this.jobsite.longitude = lon ? lon: this.jobsite.longitude ;
        this.jobsite.within    = rad ? rad: this.jobsite.within    ;

        delete this.jobsite['_$visited'];

        this.db.saveJobsite(this.jobsite).then((res) => {
          Log.l("saveSite(): Successfully saved jobsite.");
          resolve(res);
        }).catch((err) => {
          Log.l("saveSite(): Error saving jobsite!");
          Log.e(err);
          this.notify.addError("ERROR", `Error saving work site: ${err.message}`, 10000);
          reject(err);
        });
      }
    });
  }

  public async onSubmit() {
    let spinnerID;
    try {
      Log.l("onSubmit(): Now attempting to save jobsite from form:");
      spinnerID = await this.alert.showSpinnerPromise('Saving job site...');
      let res:any = await this.saveSite();
      let out:any = await this.alert.hideSpinnerPromise(spinnerID);
      this.notify.addSuccess("SAVED", "Saved jobsite successfully.", 3000);
      this.cancelEdit = false;
      this.leavePage();
      return res;
    } catch(err) {
      Log.l("onSubmit(): Error saving site.");
      Log.e(err);
      let out:any = await this.alert.hideSpinnerPromise(spinnerID);
      this.notify.addError("ERROR", `Error saving site: ${err.message}`, 5000);
    }
  }

  public leavePage() {
    // if(this.source === 'worksites') {
    //   this.navCtrl.setRoot("Work Sites");
    // } else {
    //   this.viewCtrl.dismiss();
    // }
    if(this.cancelEdit) {
      this.cancel();
    } else {
      // this.navCtrl.setRoot("Work Sites");
      this.exitPage();
    }
  }

  public async saveNoExit() {
    let spinnerID;
    try {
      Log.l("saveNoExit(): Now attempting to save jobsite from form:");
      spinnerID = await this.alert.showSpinnerPromise('Saving job site...');
      let res:any = await this.saveSite();
      let out:any = await this.alert.hideSpinnerPromise(spinnerID);
      this.notify.addSuccess("SUCCESS", "Saved jobsite successfully");
      this.cancelEdit = false;
      // this.leavePage();
      return res;
    } catch(err) {
      Log.l("saveNoExit(): Error saving site.");
      Log.e(err);
      let out:any = await this.alert.hideSpinnerPromise(spinnerID);
      this.notify.addError("ERROR", `Error saving site: ${err.message}`, 5000);
    }
  }

  // public editSiteHours() {
  //   Log.l("editSiteHours(): Called, now editing site hours...");
  //   let editSiteHoursModal = this.modalCtrl.create('Edit Site Hours', { shiftRotations: this.rotations, jobsite: this.jobsite }, { cssClass: 'edit-site-hours-modal' });
  //   editSiteHoursModal.onDidDismiss(data => {
  //     Log.l("Got back:\n", data);
  //   });
  //   editSiteHoursModal.present();
  // }

  public editSiteHours(event:any) {
    Log.l("editSiteHours(): Called with event:\n", event);
    // let editSiteHoursModal = this.modalCtrl.create('Edit Site Hours', { shiftRotations: this.rotations, jobsite: this.jobsite }, { cssClass: 'edit-site-hours-modal' });
    // editSiteHoursModal.onDidDismiss(data => {
    //   Log.l("Got back:\n", data);
    // });
    // editSiteHoursModal.present();
    // this.hoursOverlay.show(event);
    // this.hoursOverlay.show({}, this.overlayTarget.nativeElement);
    this.showHoursDialog();
  }

  public showHoursDialog() {
    this.hoursDialogVisible = true;
  }

  public hideHoursDialog() {
    this.hoursDialogVisible = false;
  }

  public jobsiteUpdated(event:any) {
    Log.l("jobsiteUpdated(): Event received:\n", event);
    // this.hoursOverlay.hide();
    this.hideHoursDialog();
  }


  public async cancel(event?:any):Promise<any> {
    let res:any
    try {
      Log.l("Canceled input of job site.");
      let confirm:boolean = await this.alert.showConfirmYesNo("CANCEL", "Are you sure you want to cancel? Any unsaved changes will be lost.");
      if(confirm) {
        this.cancelEdit = false;
        this.exitPage(true);
      } else {
        Log.l("cancel(): User declined to cancel edit.")
      }
      return res;
    } catch(err) {
      Log.l(`cancel(): Error during cancel!`);
      Log.e(err);
      throw err;
    }
  }

  public exitPage(isCancel?:boolean) {
    let res:any;
    if(this.mode.toLowerCase() === 'add' && isCancel) {
      let i = this.sites.indexOf(this.newSite);
      if(i > -1) {
        this.sites.splice(i, 1);
      }
    } else {
    }
    if(this.source === 'worksites' && !this.modal) {
      this.navCtrl.setRoot("Work Sites");
    } else {
      this.viewCtrl.dismiss();
    }
  }

  public cancelAndExitModal(evt?:any) {
    let event = evt ? evt : null;
    Log.l(`cancelAndExitModal(): Event is:\n`, event);
    this.cancel(event);
  }

  public startTimeUpdated(shiftType:string, time:string) {
    Log.l("startTimeUpdated(): Now updating start time for '%s' to '%s'...", shiftType, time);
    this.jobsite.shift_start_times[shiftType] = time;
    // if(shiftType === 'AM') {
    //   this.jobsite.shift_start_times.AM = time;
    // } else if(shiftType === 'PM') {
    //   this.jobsite.shift_start_times.PM = time;
    // }
  }

  public addressCopy(direction: "up" | "down") {
    // let f = this.jobSiteForm.value;
    let f = this.jobsite;
    let a1 = f.address;
    let b1 = f.billing_address;
    let src = a1, dest = b1;
    if(direction === 'down') {
      dest.city = src.city                     + "";
      dest.state = src.state                   + "";
      dest.zipcode = src.zipcode               + "";
      dest.street.street1 = src.street.street1 + "";
      dest.street.street2 = src.street.street2 + "";
      // this.updateDisplay();
    } else if(direction === 'up') {
      src = b1, dest = a1;
      dest.city = src.city                     + "";
      dest.state = src.state                   + "";
      dest.zipcode = src.zipcode               + "";
      dest.street.street1 = src.street.street1 + "";
      dest.street.street2 = src.street.street2 + "";
      // this.updateDisplay();
    } else {
      let errStr = `addressCopy(): Invalid option '${direction}' passed! Valid options are 'down' (address to billing) or 'up' (billing to address)!`;
      Log.w(errStr);
      this.alert.showAlert("ERROR", errStr);
    }
  }

  public numberize(val:any) {
    let num = Number(val);
    if(isNaN(num)) {
      Log.w("numberize(): Non-numerical value specified: " + val);
      return null;
    } else {
      return num;
    }
  }

  public sitePrevious() {
    if(this.siteIndex > 1) {
      this.siteIndex--;
      this.jobsite = this.sites[this.siteIndex - 1];
      this.updateDisplay();
    }
  }

  public siteNext() {
    if(this.siteIndex < this.siteCount) {
      this.siteIndex++;
      this.jobsite = this.sites[this.siteIndex - 1];
      this.updateDisplay();
    }
  }

  public noPrevious() {
    this.notify.addWarn("ALERT", `No previous work site.`, 3000);
    // this.alert.showAlert("START OF SITES", "Can't go to previous work site. Already at start of list.");
  }

  public noNext() {
    this.notify.addWarn("ALERT", `No next work site.`, 3000);
    // this.alert.showAlert("END OF SITES", "Can't go to next work site. Already at end of list.");
  }

  public addSiteLocaleSave(evt?:any) {
    let event:any = evt ? evt : "NO_SITE_LOCALE";
    Log.l(`addSiteLocaleSave(): Site Locale added, event is:\n`, event);
    this.addSiteLocaleVisible = false;
    if(event instanceof SESAClient) {
      let client:SESAClient = event;
      let item:SelectItem = {
        label: client.value,
        value: client,
      };
      this.clientMenu.push(item);
      this.client = client;
      this.updateClient(client);
    } else if(event instanceof SESALocation) {
      let location:SESALocation = event;
      let item:SelectItem = {
        label: location.fullName,
        value: location,
      };
      this.locationMenu.push(item);
      this.location = location;
      this.updateLocation(location);
    } else if(event instanceof SESALocID) {
      let locID:SESALocID = event;
      let item:SelectItem = {
        label: locID.fullName,
        value: locID,
      };
      this.locIDMenu.push(item);
      this.locID = locID;
      this.updateLocID(locID);
    }
  }

  public addSiteLocaleCancel(evt?:any) {
    Log.l(`addSiteLocaleCancel(): Add Site Locale canceled`);
    this.addSiteLocaleVisible = false;
  }

  public async setRadius(radius:number):Promise<any> {
    // this.siteRadius = radius;
    Log.l(`setRadius(): Started.`);

    let out:any = await this.updateOverlays();
    Log.l(`setRadius(): Returning...`);
    return out;
    // this.fitMapBounds();
    // this.refreshMap();
    // new google.maps.Circle({center: {lat: 36.90707, lng: 30.56533}, fillColor: '#1976D2', fillOpacity: 0.35, strokeWeight: 1, radius: 1500}),
  }

  public async updateOverlays(evt?:any):Promise<any> {
    // this.refreshMap();
    // setTimeout(() => {
      Log.l(`updateOverlays(): Started.`);
      let out:any = await this.createGoogleMapsOverlays();
      Log.l(`updateOverlays(): Returning...`);
      return out;
    // }, 500);
  }

  public fitMapBounds() {
    if(this.googleMapComponent && Array.isArray(this.gmapOverlays) && this.gmapOverlays.length > 0) {
      let map = this.googleMapComponent.getMap();
      let circle = this.gmapOverlays[0];
      let bounds = circle.getBounds();
      map.fitBounds(bounds);
    }
  }

  public addGoogleMapListener() {
    if(this.googleMapComponent) {
      let map = this.googleMapComponent.getMap();
      // map.addListener('dblclick', (e) => {
      map.addListener('rightclick', (e) => {
        this.handleMapRightClick(e);
      });
      map.addListener('click', (e) => {
        this.handleMapSingleClick(e);
      });
    }
  }

  public async createGoogleMapsOverlays():Promise<any> {
    try {
      return new Promise((resolve,reject) => {
        if(this.jobsite) {
          Log.l(`createGoogleMapsOverlays(): current jobsite is:\n`, this.jobsite)
          let latitude  : number = Number(this.jobsite.latitude)  ||  26.177260;
          let longitude : number = Number(this.jobsite.longitude) || -97.964594;
          let radius    : number = this.jobsite.within ? Number(this.jobsite.within) : 500;
          // let radius:number = this.siteRadius ? Number(this.siteRadius) : 500;
          let strColor:string = this.radiusColor;
          let strokeColor:string = "rgba(255, 0, 0, 0.8)";
          let overlays:Array<any> = [];
          let zoom:number = 16;
          if(radius < 20) {
            zoom = 21;
          } else if(radius < 50) {
            zoom = 20;
          } else if(radius < 100) {
            zoom = 19;
          } else if(radius < 250) {
            zoom = 18;
          } else if(radius < 500) {
            zoom = 17;
          } else {
            zoom = 16;
          }
          let center:any = {
            lat: latitude ,
            lng: longitude,
          }
          let options:any = {
            center: center,
            mapTypeId: 'hybrid',
            zoom: zoom,
          };
          let circle:any = new google.maps.Circle(
            {
              center: center,
              fillColor: strColor,
              strokeColor: strokeColor,
              strokeWeight: 1,
              radius: radius,
            }
          );
          // this.gmapOverlays = [];
          // this.gmapOverlays.push(circle);
          // this.gmapOptions = options;
          overlays.push(circle);
          Log.l(`createGoogleMapOverlays(): Options and overlays will be:\n`, options);
          Log.l(overlays);
          this.gmapOptions = options;
          this.gmapOverlays = overlays;
          if(this.googleMapComponent) {
            setTimeout(() => {
              this.googleMapComponent.initialize();
              let map:any = this.googleMapComponent.getMap();
              map.setCenter(center);
              map.setZoom(zoom);
              this.fitMapBounds();
              this.addGoogleMapListener();
              Log.l(`createGoogleMapOverlays(): Done doing all the google maps stuff.`);
              resolve(true);
            }, this.mapUpdateDelay);
          } else {
            Log.l(`createGoogleMapOverlays(): Oh no, couldn't initialize the Google Maps stuff!`);
            resolve(false);
          }
          // return overlays;
        } else {
          let errText:string = `createGoogleMapsOverlays(): Invalid jobsite.`;
          Log.l(errText);
          let err:Error = new Error(errText);
          Log.e(err);
          reject(err);
        }
      });
    } catch(err) {
      Log.l(`createGoogleMapsOverlays(): Error creating overlays, perhaps invalid jobsite or location`);
      Log.e(err);
      throw err;
    }
  }

  public clearGeofenceCircle():any {
    this.gmapOverlays = null;
    this.updateOverlays();
    // this.createGoogleMapsOverlays();
    // this.refreshMap();
  }

  public addTempMapMarker(pos:ILatLng) {
    let radius:number = this.jobsite.within || 500;
    let center = pos;
    let map = this.googleMapComponent.getMap();
    let tmpColor:string       = this.tmpColor       ;
    let tmpStrokeColor:string = this.tmpStrokeColor ;
    let marker = new google.maps.Marker({
      position: center
    });
    let tmpCircle:any = new google.maps.Circle(
      {
        center: center,
        fillColor: tmpColor,
        strokeColor: tmpStrokeColor,
        strokeWeight: 1,
        radius: radius,
      }
    );
    this.gmapOverlays.push(marker);
    this.gmapOverlays.push(tmpCircle);
  }

  public async handleMapRightClick(evt?:any) {
    try {
      let keys = Object.keys(evt);
      let event:MouseEvent;
      for(let key of keys) {
        let item:any = evt[key];
        if(item instanceof MouseEvent) {
          event = item;
          break;
        }
      }
      // let event:any = evt && evt.fa ? evt.fa : evt;
      let loc:any = evt && evt.latLng ? evt.latLng : null;
      Log.l(`handleMapRightClick(): Map clicked, event is:\n`, evt);
      if(event && loc) {
        let lat:number = loc.lat();
        let lon:number = loc.lng();
        let strLat:string = sprintf("%.6f", lat);
        let strLon:string = sprintf("%.6f", lon);
        let newLat:number = Number(strLat);
        let newLon:number = Number(strLon);
        let pos = {
          lat: newLat,
          lng: newLon,
        };
        this.addTempMapMarker(pos);
        // if(event.shiftKey) {
        let addNewLocation:boolean = true;
        if(addNewLocation) {
          let confirm:boolean = await this.alert.showConfirmYesNo("UPDATE SITE", `Do you want to set the work site location to (${strLat}, ${strLon})?`);
          if(confirm) {
            this.jobsite.latitude  = newLat;
            this.jobsite.longitude = newLon;
            this.updateOverlays();
          } else {
            Log.l("handleMapRightClick(): User chose not to update jobsite.");
            this.gmapOverlays.pop();
            this.gmapOverlays.pop();
            this.notify.addInfo("CANCELED", `Job site location not updated.`, 3000);
          }
        } else {
          this.notify.addInfo("MAP CLICKED", `Map clicked at (${lat}, ${lon})`, 3000);
        }
      }
    } catch(err) {
      Log.l(`handleMapRightClick(): Error during handling of map click!`);
      Log.e(err);
      this.notify.addError("ERROR", `Error clicking map: '${err.message}'`, 4000);
      // throw err;
    }
  }

  public async handleMapSingleClick(evt?:any) {
    try {
      let keys = Object.keys(evt);
      let event:MouseEvent;
      for(let key of keys) {
        let item:any = evt[key];
        if(item instanceof MouseEvent) {
          event = item;
          break;
        }
      }
      // let event:any = evt && evt.fa ? evt.fa : evt;
      let loc:any = evt && evt.latLng ? evt.latLng : null;
      Log.l(`handleMapSingleClick(): Map clicked, event is:\n`, evt);
      if(event && loc) {
        let lat:number = loc.lat();
        let lon:number = loc.lng();
        let strLat:string = sprintf("%.6f", lat);
        let strLon:string = sprintf("%.6f", lon);
        let newLat:number = Number(strLat);
        let newLon:number = Number(strLon);
        let pos = {
          lat: newLat,
          lng: newLon,
        };
        // this.addTempMapMarker(pos);
        if(event.shiftKey) {
          this.notify.addInfo("MAP CLICKED", `Map shift-clicked at (${lat}, ${lon})`, 3000);
        } else {
          this.notify.addInfo("MAP CLICKED", `Map clicked at (${lat}, ${lon})`, 3000);
        }
      }
    } catch(err) {
      Log.l(`handleMapClick(): Error during handling of map click!`);
      Log.e(err);
      this.notify.addError("ERROR", `Error clicking map: '${err.message}'`, 4000);
      // throw err;
    }
  }

  public refreshMap() {
    let map:GMap = this.googleMapComponent;
    if(map) {
      this.googleMapComponent.initialize();
    } else {
      Log.w(`refreshMap(): Can't refresh map when no map is displayed.`);
    }
  }


}
