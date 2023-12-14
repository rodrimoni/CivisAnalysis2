var CONGRESS_DEFINE = {
    votoToInteger : {"Sim":0,"Não":1,"Abstenção":2,"Obstrução":3,"Art. 17":4,"Branco":5},
    integerToVote : ["Sim","Não","Abstenção","Obstrução","Art. 17","Branco"],
    //var integerToVote = {'0':"Sim",'1':"Não",'2':"Abstenção",'3':"Obstrução",'4':"Art. 17",'5':"Branco"};

    startingYear : 1991,
    endingYear : 2023,

    // renamed parties
    // PFL ==> DEM
    // PPB ==> PP
    // PL + PRONA ==> PR
    legislatures : [
        {name:'49th Legislature', regimeParty:'PFL',  period:[new Date(1991,1,1) ,new Date(1995,0,31)]},
        {name:'50th Legislature', regimeParty:'PFL', period:[new Date(1995,1,1) ,new Date(1999,0,31)]},
        {name:'51th Legislature', regimeParty:'PSDB', period:[new Date(1999,1,1) ,new Date(2003,0,31)]},
        {name:'52th Legislature', regimeParty:'PT',   period:[new Date(2003,1,1) ,new Date(2007,0,31)]},
        {name:'53th Legislature', regimeParty:'PT',   period:[new Date(2007,1,1) ,new Date(2011,0,31)]},
        {name:'54th Legislature', regimeParty:'PT',   period:[new Date(2011,1,1) ,new Date(2015,0,31)]},
        {name:'55th Legislature', regimeParty:'PMDB',   period:[new Date(2015,1,1) ,new Date(2019,0,31)]},
        {name:'56th Legislature', regimeParty:'PSL',   period:[new Date(2019,1,1) ,new Date(2023,0,31)]},
        {name:'57th Legislature', regimeParty:'PT',   period:[new Date(2023,1,1) ,new Date(2025,0,31)]},
    ],

    presidents : [
        {name: 'Collor (PRN)'     , party:'PRN', period:[new Date(1991,0,1),  new Date(1992,11,29)]},
        {name: 'Itamar (PMDB)'    , party:'PMDB', period:[new Date(1992,11,29),new Date(1995,0,1)]},
        {name: 'FHC (PSDB) 1st Term', party:'PSDB', period:[new Date(1995,0,1),  new Date(1999,0,1)]},
        {name: 'FHC (PSDB) 2nd Term', party:'PSDB', period:[new Date(1999,0,1),  new Date(2003,0,1)]},
        {name: 'Lula (PT) 1st Term' , party:'PT', period:[new Date(2003,0,1),  new Date(2007,0,1)]},
        {name: 'Lula (PT) 2nd Term' , party:'PT', period:[new Date(2007,0,1),  new Date(2011,0,1)]},
        {name: 'Dilma (PT) 1st Term', party:'PT', period:[new Date(2011,0,1),  new Date(2015,0,1)]},
        {name: 'Dilma (PT)', party:'PT', period:[new Date(2015,0,1),  new Date(2016,4,12)]},
        {name: 'Temer (PMDB)', party:'PMDB', period:[new Date(2016,4,13),  new Date(2019,0,1)]},
        {name: 'Bolsonaro (PSL)', party:'PSL', period:[new Date(2019,0,1),  new Date(2023,0,1)]},
        {name: 'Lula (PT)', party:'PT', period:[new Date(2023,0,1),  new Date(2025,0,1)]},
    ],

    //- organization:
    // the first alliances[0] is the elected
    // the first party[0] of the alliance is the party of the elected president
    elections : {
        49: {
            name: "1989",
            turns:2,
            dates:[new Date(1989,10,15)],
            alliances: [
                {
                    president:"Collor (PRN)", name:"Movimento Brasil Novo",
                    parties:["PRN", "PSC", "PTR", "PST"],
                    result:[0.3057,0.5304]
                },
                {
                    president:"Lula (PT)" , name:"Frente Brasil Popular",
                    parties:["PT","PSB","PCdoB"],
                    result:[0.1718,0.4696]
                },
                {
                    president:"Brizola (PDT)", name:'PDT',
                    parties:["PDT"],
                    result:[0.1651]
                },
                {
                    president:"Covas (PSDB)", name:"PSDB",
                    parties:["PSDB"],
                    result:[0.1151]
                }
            ]
        },
        50: {
            name: "1994",
            turns:1,
            dates:[new Date(1994,9,2)],
            alliances: [
                {
                    president:"FHC (PSDB)", name:"União,Trabalho e Progresso",
                    parties:["PSDB","PFL","DEM","PTB"],
                    result:[0.5427]
                },
                {
                    president:"Lula (PT)" , name:"Frente Brasil Popular da Cidadania",
                    parties:["PT","PSB","PCdoB","PPS","PV","PSTU"],
                    result:[0.2704]
                },
                {
                    president:"Enéas (PRONA)", name:'PRONA',
                    parties:["PRONA"],
                    result:[0.0738]
                },
                {
                    president:"Orestes (PMDB)", name:"O Desenvolvimento do Brasil",
                    parties:["PMDB","PSD"],
                    result:[0.0438]
                }
            ]
        },

        51: {
            name: "1998",
            turns:1,
            dates:[new Date(1998,9,4)],
            alliances: [
                {
                    president:"FHC (PSDB)", name:"Coligação União, trabalho e progresso",
                    parties:["PSDB","DEM","PFL","PP","PPB","PTB"],
                    result:[0.5306]
                },
                {
                    president:"Lula (PT)" , name:"Coligação União do Povo - Muda Brasil",
                    parties:["PT","PDT","PSB","PCdoB","PCB"],
                    result:[0.3171]
                },
                {
                    president:"Ciro Gomes (PPS)", name:"Coligação Brasil Real e Justo",
                    parties:["PPS","PMDB","PR","PL","PAN"],
                    result:[0.1097]
                },
                {
                    president:"Enéas (PRONA)", name:'PRONA',
                    parties:["PRONA"],
                    result:[0.0214]
                }
            ]
        },
        52: {
            name: "2002",
            turns:2,
            dates:[new Date(2002,9,6),new Date(2002,9,27)],
            alliances: [
                {
                    president:"Lula (PT)", name:"Coligação Lula Presidente",
                    parties:["PT","PL","PR","PV","PCdoB","PMN","PCB"],
                    result:[0.4647,0.6128]
                },
                {
                    president:"José Serra (PSDB)", name:"Coligação Grande Aliança",
                    parties:["PSDB","PMDB"],
                    result:[0.2319,0.3872]
                },
                {
                    president:"Anthony Garotinho (PSB)", name:"Coligação Brasil Esperança",
                    parties:["PSB","PPB","PP","PTC","PHS","PSL"],
                    result:[0.1786]
                },
                {
                    president:"Ciro Gomes (PPS)", name:"Coligação Frente Trabalhista",
                    parties:["PPS","PDT","PTB"],
                    result:[0.1197]
                }
            ]
        },
        53: {
            name: "2006",
            turns:2,
            dates:[new Date(2006,9,1),new Date(2006,9,29)],
            alliances: [
                {
                    president:"Lula (PT)", name:"Coligação A Força do Povo",
                    parties:["PT","PRB","PCdoB"],
                    result:[0.4861,0.6083]
                },
                {
                    president:"Geraldo Alckmin (PSDB)", name:"Coligação por um Brasil Decente",
                    parties:["PSDB","PFL","DEM"],
                    result:[0.4164,0.3917]
                },
                {
                    president:"Heloísa Helena (PSOL)", name:"Coligação Frente de Esquerda",
                    parties:["PSOL", "PCB", "PSTU"],
                    result:[0.0685]
                },
                {
                    president:"Cristovam Buarque (PDT)", name:"PDT",
                    parties:["PDT"],
                    result:[0.0264]
                }
            ]
        },
        54:{
            name: "2010",
            turns:2,
            dates:[new Date(2010,9,3),new Date(2010,9,31)],
            alliances: [
                {
                    president:"Dilma Rousseff (PT)", name:"Coligação Para o Brasil Seguir Mudando",
                    parties:["PT", "PMDB", "PDT", "PCdoB", "PSB", "PR","PL", "PRB", "PTN", "PSC", "PTC"],
                    result:[0.4691,0.5605]
                },
                {
                    president:"José Serra (PSDB)", name:"Coligação O Brasil Pode Mais",
                    parties:["PSDB", "DEM","PFL", "PTB", "PPS", "PMN", "PTdoB"],
                    result:[0.3261,0.4395]
                },
                {
                    president:"Marina Silva (PV)", name:"PV",
                    parties:["PV"],
                    result:[0.1933]
                },
                {
                    president:"Plínio de Arruda (PSOL)", name:"PSOL",
                    parties:["PSOL"],
                    result:[0.0087]
                }
            ]
        },
        55:{
            name: "2014",
            turns:2,
            dates:[new Date(2014,10,3)],
            alliances: [
                {
                    president:"Dilma Rousseff (PT)", vice:"Michel Temer (PMDB)", name:"Coligação Com a Força do Povo",
                    parties:["PT", "PP", "PROS", "PCdoB", "PMDB", "PSD","PR", "PDT", "PRB"],
                    result:[0.4159,0.5164]
                },
                {
                    president:"Aécio Neves (PSDB)", vice:"Aloysio Nunes (PSDB)", name:"Coligação Muda Brasil",
                    parties:["PSDB", "DEM","PFL","PTN","PTC","PTB","SDD", "PEN", "PTdoB","PMN"],
                    result:[0.3355,0.4836]
                },
                {
                    president:"Marina Silva (PSB)", vice:"Beto Albuquerque (PSB)", name:"Coligação Unidos pelo Brasil",
                    parties:["PSB","PPS","PHS","PRP","PPL","PSL"],
                    result:[0.2132]
                },
                {
                    president:"Luciana Genro (PSOL)",vice:"Jorge Paz (PSOL)", name:"PSOL",
                    parties:["PSOL"],
                    result:[0.0155]
                }
            ]
        },
        56:{
            name: "2018",
            turns:2,
            dates:[new Date(2018,10,7)],
            alliances: [
            ]
        },

        57:{
            name: "2022",
            turns:2,
            dates:[new Date(2022,10,7)],
            alliances: [
            ]
        }
    },

    // COLORS!
    // ===============================================================================================================
    // colors representing the single vote value
    votoStringToColor : {"Sim":"#313695","Não":"#a50026","Abstenção":"purple","Obstrução":"green","Art. 17":"yellow","null":'grey'},

    // ===============================================================================================================
    votingColorGradient : ['#a50026','#d73027','#f46d43','#fdae61','#fee090','#ffffbf','#e0f3f8','#abd9e9','#74add1','#4575b4','#313695'],

    // ================================================================================================================
    partiesArbitraryColor : {"DEM":"LightCoral", "PFL":"LightCoral", "União": "LightCoral", // PFL ==> DEM ===> União
        "PSDB":"#1f77b4",
        "PP":"#EF31BB", "PPB": "#EF31BB", // PPB ==> PP
        "PL":"#ffbb78", "PR":"#ffbb78",   // PL + PRONA ==> PR
        "MDB":"#393b79", "PMDB":"#393b79", // MDB => PMDB => MDB
        "PT":"#d62728",
        "PDT":"#E70641", "PSB":"LightGreen",
        "PTB":"#9467bd",
        "PSD":"#660000",
        "PSOL":"#FFCC00",
        "PV":"#e377c2",
        "PPS":"#666",
        "PCdoB":"Brown",
        "SDD":"DarkOrange",
        "Solidaried":"DarkOrange ",
        "PROS":"#CA6125",
        "PRONA": "DarkOrange",
        "PRN": "#8c564b","PSC":"#8c564b",
        "NOVO": "#EC722C",
        "PSL": "#277E2F",
        "Republicanos": "#0066CC",
        "REDE": "#2F9E8D", 
        "Avante": "#2EABB1",
        "CIDADANIA": "#EC008C",
        "Podemos": "#a5d6a4",
        "Patriota": "#337A9E",
    },
    partiesIdeologyColor: {
        'left-wing': 'darkred',
        center: 'darkgreen',
        'right-wing': 'rgb(73, 75, 128)'
    },
    partiesMilitaryColor: {
        ARENA: {color:'rgb(73, 75, 128)', name:'ARENA - Pro-Military Regime',title:'Aliança Renovadora Nacional',wiki:'http://pt.wikipedia.org/wiki/Alian%C3%A7a_Renovadora_Nacional'},
        MDB: {color:'darkgreen', name:'MDB - Allowed Opposition', title:'Movimento Democrático Brasileiro',wiki:'http://pt.wikipedia.org/wiki/Movimento_Democr%C3%A1tico_Brasileiro'},
        mix: {color:'darkred', name:'MDB + Anti-Regime',wiki:''},
        Illegal: {color:'red', name:'Anti-Regime',title:'Unionist + No Political Rights + Exile + Guerrilla',wiki:'http://pt.wikipedia.org/wiki/Ditadura_militar_no_Brasil_(1964-1985)#Repress.C3.A3o'}
    },
    // partiesIdeologyColor : {
    // 		DEM: "rgb(79, 46, 157)",	PFL: "rgb(79, 46, 157)",
    // 		PCdoB: "Brown",
    // 		PDT: "#c74635",
    // 		PL: "#395eb3",PR: "#395eb3",
    // 		PMDB: "#39793b",
    // 		PP: "#1c769f",PPB: "#1c769f",
    // 		PPS: "#ed3b3b",
    // 		PL:"#395eb3",
    // 		PRN: "rgb(45, 132, 137)",
    // 		PRONA: "#3b3397",
    // 		PROS: "#ff1e00",
    // 		PSB: "#dc4444",
    // 		PSC: "#5779b1",
    // 		PSD: "#5d5ec4",
    // 		PSDB: "rgb(147, 165, 37)",
    // 		PSOL: "#ff4400",
    // 		PT: "#d62728",
    // 		PTB: "#4f72a6",
    // 		PV: "#e27e83",
    // 		SDD: "#5316c1",
    // 		Solidaried: "5316c1 ",
    // },
    partiesColors:{},

    setIdeologyColors: function() {
        for (var partyIndex in CONGRESS_DEFINE.parties ) {
            var party = CONGRESS_DEFINE.parties[partyIndex];
            CONGRESS_DEFINE.partiesColors[partyIndex] =
                (CONGRESS_DEFINE.partiesIdeologyColor[party.wing]!=='')?
                    CONGRESS_DEFINE.partiesIdeologyColor[party.wing]
                    : "#AAA" ;
        }
    },
    setMilitaryColors: function() {
        for (var partyIndex in  CONGRESS_DEFINE.parties ) {
            var party = CONGRESS_DEFINE.parties[partyIndex];
            CONGRESS_DEFINE.partiesColors[partyIndex] =
                ( (party.military!=='') && CONGRESS_DEFINE.partiesMilitaryColor[party.military].color!=='')?
                    CONGRESS_DEFINE.partiesMilitaryColor[party.military].color
                    : "#AAA" ;
        }
    },
    setArbitraryColors: function() {
        for (var partyIndex in  CONGRESS_DEFINE.parties ) {

            if(CONGRESS_DEFINE.partiesArbitraryColor[partyIndex] !== undefined)
                CONGRESS_DEFINE.partiesColors[partyIndex] = CONGRESS_DEFINE.partiesArbitraryColor[partyIndex];
            else CONGRESS_DEFINE.partiesColors[partyIndex] = "#AAA" ;
        }

        for (var party in CONGRESS_DEFINE.partiesArbitraryColor) {
            CONGRESS_DEFINE.partiesColors[party] = CONGRESS_DEFINE.partiesArbitraryColor[party];
        }
    },
    // PARTY COLORS =================================================================================================
    getConstantPartyColor : function(party){
        if(CONGRESS_DEFINE.partiesColors[party] !== undefined )
        {return CONGRESS_DEFINE.partiesColors[party];}
        else{ /*console.log(party);*/ return "#AAA" }
    },
    setConstantPartyColor : function(party,color){
        CONGRESS_DEFINE.partiesColors[party] = color;
    }
};

CONGRESS_DEFINE.years = $.map( d3.range(CONGRESS_DEFINE.startingYear, CONGRESS_DEFINE.endingYear+1), function(d){ return {name:d, period:[new Date(d,0,1), new Date(d+1,0,1)] }   });

CONGRESS_DEFINE.votingColor = d3.scale.quantize()
    .domain([-1.0, 1.0])
    .range(d3.range(11).map(function(d) {  return CONGRESS_DEFINE.votingColorGradient[d] ; }));

// getPartyColor changes as the paties goes to an electoral alliance
CONGRESS_DEFINE.getPartyColor = CONGRESS_DEFINE.getConstantPartyColor;


//Extents by years to build the timeline crop scale
CONGRESS_DEFINE.timelineCropExtent ={"1991":[-0.7502,0.2766],"1992":[-0.5737,0.3345],"1993":[-0.7189,0.6815],"1994":[-0.6744,0.3785],"1995":[-0.8266,0.103],"1996":[-0.868,0.1862],"1997":[-0.9633,0.09928],"1998":[-0.6642,0.202],"1999":[-1.049,0.1258],"2000":[-1.153,0.3573],"2001":[-0.981,0.2496],"2002":[-0.8191,0.4574],"2003":[-0.9816,0.2288],"2004":[-0.8146,0.4025],"2005":[-0.8,0.506],"2006":[-0.8037,0.5122],"2007":[-1.06,0.1498],"2008":[-0.9673,0.3039],"2009":[-0.9931,0.333],"2010":[-0.7985,0.4744],"2011":[-0.9054,0.325],"2012":[-0.732,0.6281],"2013":[-0.8085,0.8051],"2014":[-0.5638,0.7591],"2015":[-1.166,0.7621],"2016":[-1.112,0.4995],"2017":[-1.024,0.2872],"2018":[-0.8794,0.3432],"2019":[-1.192,0.5738],"2020":[-0.7282,0.3942],"2021":[-1.451,0.435],"2022":[-1.375,0.6517],"2023":[-0.9755,0.6449]};

//GOV VS Opp trace 1-1 year
CONGRESS_DEFINE.partiesTraces1by1 = PARTIES_TRACES;

CONGRESS_DEFINE.parties = {
    DEM:{name:'Democratas',wing:'right-wing',military:'ARENA',wiki:'http://pt.wikipedia.org/wiki/Democratas_(Brasil)'},
    PFL:{name:'Partido da Frente Liberal',wing:'right-wing',military:'ARENA',wiki:'http://pt.wikipedia.org/wiki/Partido_da_Frente_Liberal'},
    NoParty: {name:'No Party',wing:'',military:''},
    PCB:{name:'Partido Comunista Brasileiro',wing:'left-wing',military:'Illegal',wiki:'http://pt.wikipedia.org/wiki/Partido_Comunista_Brasileiro'},
    PCdoB:{name:'Partido Comunista do Brasil',wing:'left-wing',military:'Illegal',wiki:'http://pt.wikipedia.org/wiki/Partido_Comunista_do_Brasil'},
    PDC:{name:'Partido Democrata Cristão',wing:'right-wing',military:'ARENA', wiki:'http://pt.wikipedia.org/wiki/Partido_Democrata_Crist%C3%A3o_(1985-1993)'},
    PDS:{name:'Partido Democrático Social',wing:'right-wing',military:'ARENA',wiki:'http://pt.wikipedia.org/wiki/Partido_Democr%C3%A1tico_Social'},
    PDT:{name:'Parido Democrático Trabalhista',wing:'left-wing',military:'mix',wiki:'http://pt.wikipedia.org/wiki/Partido_Democr%C3%A1tico_Trabalhista'},
    PEN:{name:'Partido Ecológico Nacional',wing:'right-wing',military:'',wiki:'http://pt.wikipedia.org/wiki/Partido_Ecol%C3%B3gico_Nacional'},
    PHS:{name:'Partido Humanista da Solidariedade',wing:'right-wing',military:'',wiki:'http://pt.wikipedia.org/wiki/Partido_Humanista_da_Solidariedade'},
    PMDB:{name:'Partido do Movimento Democrático Brasileiro',wing:'center',military:'MDB',wiki:'http://pt.wikipedia.org/wiki/Partido_do_Movimento_Democr%C3%A1tico_Brasileiro'},
    PMN:{name:'Partido da Mobilização Nacional',wing:'right-wing',military:'',wiki:'http://pt.wikipedia.org/wiki/Partido_da_Mobiliza%C3%A7%C3%A3o_Nacional'},
    PP: {name:'Partido Progressista',wing:'right-wing',military:'ARENA',wiki:'http://pt.wikipedia.org/wiki/Partido_Progressista_(Brasil)'},
    PPR:{name:'Partido Progressista Renovador',wing:'right-wing',military:'ARENA', wiki:'http://pt.wikipedia.org/wiki/Partido_Progressista_Renovador'},
    PPS:{name:'Partido Popular Socialista',wing:'left-wing',military:'Illegal', wiki:'http://pt.wikipedia.org/wiki/Partido_Popular_Socialista'},
    PR: {name:'Partido da República',wing:'right-wing',military:'ARENA',wiki:'http://pt.wikipedia.org/wiki/Partido_da_Rep%C3%BAblica'},
    PL: {name:'Partido Liberal',wing:'right-wing',military:'ARENA',wiki:'http://pt.wikipedia.org/wiki/Partido_Liberal_%28Brasil%29'},
    PRB:{name:'Partido Republicano Brasileiro',wing:'right-wing',military:'',wiki:'http://pt.wikipedia.org/wiki/Partido_Republicano_Brasileiro'},
    PRN:{name:'Partido da Renovação Nacional',wing:'right-wing',military:'', wiki:'http://pt.wikipedia.org/wiki/Partido_Trabalhista_Crist%C3%A3o'},
    PRONA:{name:'Partido da Reedificação da Ordem Nacional',wing:'right-wing',military:'',wiki:'http://pt.wikipedia.org/wiki/Partido_de_Reedifica%C3%A7%C3%A3o_da_Ordem_Nacional'},
    PROS:{name:'Partido Republicano da Ordem Social',wing:'',military:'',wiki:'http://pt.wikipedia.org/wiki/Partido_Republicano_da_Ordem_Social'},
    PRP:{name:'Partido Republicano Progressista',wing:'right-wing',military:'ARENA',wiki:'http://pt.wikipedia.org/wiki/Partido_Republicano_Progressista'},
    PRS:{name:'Partido da Renovação Social',wing:'right-wing',military:'',wiki:'http://pt.wikipedia.org/wiki/Partido_de_Renova%C3%A7%C3%A3o_Social'},
    PRTB:{name:'Partido Renovador Trabalhista Brasileiro',wing:'right-wing',military:'',wiki:'http://pt.wikipedia.org/wiki/Partido_Renovador_Trabalhista_Brasileiro'},
    PSB:{name:'Partido Socialista Brasileiro',wing:'left-wing',military:'Illegal',wiki:'http://pt.wikipedia.org/wiki/Partido_Socialista_Brasileiro'},
    PSC:{name:'Partido Social Cristão',wing:'right-wing',military:'ARENA', wiki:'http://pt.wikipedia.org/wiki/Partido_Social_Crist%C3%A3o'},
    PSD:{name:'Partido Social Democrático',wing:'right-wing',military:'ARENA',wiki:'http://pt.wikipedia.org/wiki/Partido_Social_Democr%C3%A1tico_(2011)'},
    PSDB:{name:'Partido da Social Democracia Brasileira',wing:'center',military:'mix',wiki:'http://pt.wikipedia.org/wiki/Partido_da_Social_Democracia_Brasileira'},
    PSL:{name:'Partido Social Liberal',wing:'right-wing',military:'', wiki:'http://pt.wikipedia.org/wiki/Partido_Social_Liberal'},
    PSOL:{name:'Partido Socialismo e Liberdade',wing:'left-wing',military:'',wiki:'http://pt.wikipedia.org/wiki/Partido_Socialismo_e_Liberdade'},
    PST:{name:'Partido Social Trabalhista',wing:'right-wing',military:'',wiki:'http://pt.wikipedia.org/wiki/Partido_Social_Trabalhista'},
    PSTU:{name:'Partido Socialista dos Trabalhadores Unificado',wing:'left-wing',military:'Illegal',wiki:'http://pt.wikipedia.org/wiki/Partido_Socialista_dos_Trabalhadores_Unificado'},
    PT: {name:'Partido dos Trabalhadores',wing:'left-wing',military:'Illegal',wiki:'http://pt.wikipedia.org/wiki/Partido_dos_Trabalhadores'},
    PTB:{name:'Partido Trabalhista Brasileiro',wing:'right-wing',military:'ARENA',wiki:'http://pt.wikipedia.org/wiki/Partido_Trabalhista_Brasileiro'},
    PTC:{name:'Partido Trabalhista Cristão',wing:'right-wing',military:'',wiki:'http://pt.wikipedia.org/wiki/Partido_Trabalhista_Crist%C3%A3o'},
    PTN:{name:'Partido Trabalhista Nacional',wing:'right-wing',military:'',wiki:'http://pt.wikipedia.org/wiki/Partido_Trabalhista_Nacional'},
    PTR:{name:'Partido Trabalhista Reformador',wing:'right-wing',military:'ARENA', wiki:'http://pt.wikipedia.org/wiki/Partido_Trabalhista_Reformador'},
    PTdoB:{name:'Partido Trabalhista do Brasil',wing:'right-wing',military:'',wiki:'http://pt.wikipedia.org/wiki/Partido_Trabalhista_do_Brasil'},
    PV: {name:'Partido Verde',wing:'center',military:'',wiki:'http://pt.wikipedia.org/wiki/Partido_Verde_(Brasil)'},
    SDD: {name:'Solidariedade',wing:'',military:'',wiki:'http://pt.wikipedia.org/wiki/Solidariedade_(partido_pol%C3%ADtico)'},
    REDE:{name:'Rede Sustentabilidade',wing:'',military:'',wiki:'https://pt.wikipedia.org/wiki/Rede_Sustentabilidade'},
    PMB:{name:'Partido da Mulher Brasileira',wing:'',military:'',wiki:'https://pt.wikipedia.org/wiki/Partido_da_Mulher_Brasileira'},
    // New parties since 2016 update
    PSDC:{name: 'Democracia Cristã', wing:'',military:'', wiki: 'https://pt.wikipedia.org/wiki/Democracia_Crist%C3%A3_(Brasil)'},
    PMR:{name: 'Partido Municipalista Renovador', wing:'',military:'', wiki: 'https://pt.wikipedia.org/wiki/Partido_Republicano_Brasileiro'},
    Podemos :{name: 'Podemos ', wing:'',military:'', wiki: 'https://pt.wikipedia.org/wiki/Podemos_(Brasil)'},
    Avante :{name: 'Avante ', wing:'',military:'', wiki: 'https://pt.wikipedia.org/wiki/Avante'},
    MDB: {name: 'Movimento Democrático Brasileiro', wing:'center', military:'MDB', wiki: 'https://pt.wikipedia.org/wiki/Movimento_Democr%C3%A1tico_Brasileiro_(1980)'},
    Patriota: {name: 'Movimento Democrático Brasileiro', wing:'', military:'', wiki: 'https://pt.wikipedia.org/wiki/Patriota_(Brasil)'},
    PPL: {name: 'Partido Pátria Livre ', wing:'', military:'', wiki: 'https://pt.wikipedia.org/wiki/Partido_P%C3%A1tria_Livre'},
    CIDADANIA: {name: 'Cidadania', wing:'left-wing', military:'', wiki: 'https://pt.wikipedia.org/wiki/Partido_Popular_Socialista'},
    NOVO: {name: 'Novo',  wing:'right-wing', military:'', wiki: 'https://pt.wikipedia.org/wiki/Partido_Novo'},
    Republicanos: {name: 'Republicanos',  wing:'right-wing', military:'', wiki: 'https://pt.wikipedia.org/wiki/Republicanos_(partido_pol%C3%ADtico)'},
    União: {name: 'União Brasil',  wing:'right-wing', military:'', wiki: 'https://pt.wikipedia.org/wiki/Uni%C3%A3o_Brasil'},
};
/*var labelParties = [['PT','PT'],['PMDB','PMDB'],['PFL/DEM','DEM'],['PSDB','PSDB'],['PPB/PP','PP'],['PL/PR','PR'],['PDT','PDT'],['PSB','PSB']];

$(document).ready(function () {

	$.each(labelParties, function(d){
		$('#labelColorDeputies').append('<div class="input-group">'+
			'<input value='+ partiesNamesColor[labelParties[d][1]]+' class="pick-a-color"></input>'+
			'<button class="btn btn-default">'+labelParties[d][0]+'</button>'+
			'</div>'
			);
	})


   $(".pick-a-color").pickAColor({ showHexInput  : false});
});*/

CONGRESS_DEFINE.setArbitraryColors();