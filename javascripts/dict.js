var translator;
function initDict() {
    var dict =
    {
        "Reset all selections": {
            br: "Desfazer todas as seleções"
        },
        "Choose one of the following...": {
            br: "Escolha os estados...",
            en: "Choose one of the following..."
        },
        "Apply filter": {
            br: " Aplicar filtro"
        },
        "Create a bar chart": {
            br: "Criar um gráfico de barras"
        },
        "Show parties clusters": {
            br: "Mostrar os grupos por partidos"
        },
        "Create a Political Spectrum of Deputies - Technique: PCA": {
            br: "Criar um Espectro Político de Deputados - Técnica: PCA"
        },
        "Create a Political Spectrum of Deputies - Technique: MDS": {
            br: "Criar um Espectro Político de Deputados - Técnica: MDS"
        },
        "Create a Political Spectrum of Deputies - Technique: t-SNE": {
            br: "Criar um Espectro Político de Deputados - Técnica: t-SNE"
        },
        "Create a Chamber Infographic": {
            br: "Criar um Infográfico da Câmara"
        },
        "Create a Deputies Similarity Graph": {
            br: "Criar um Grafo de Similaridade dos Deputados"
        },
        "Create a Map of Roll Calls": {
            br: "Criar um Mapa de Votações"
        },
        "Create a timeline with selected deputies": {
            br: "Criar uma linha do tempo com os deputados selecionados"
        },
        "Timeline": {
            br: "Linha do tempo"
        },
        "YEARLY POLITICAL SPECTRA": {
            br: "ESPECTRO POLÍTICO ANUAL"
        },
        "GOVERNMENT": {
            br: "GOVERNO"
        },
        "OPPOSITION": {
            br: "OPOSIÇÃO"
        },
        "max RollCalls/week": {
            br: "máx. Votações/Semana"
        },
        "49th Legislature": {
            br: "49ª Legislatura"
        },
        "50th Legislature": {
            br: "50ª Legislatura"
        },
        "51th Legislature": {
            br: "51ª Legislatura"
        },
        "52th Legislature": {
            br: "52ª Legislatura"
        },
        "53th Legislature": {
            br: "53ª Legislatura"
        },
        "54th Legislature": {
            br: "54ª Legislatura"
        },
        "55th Legislature": {
            br: "55ª Legislatura"
        },
        "56th Legislature": {
            br: "56ª Legislatura"
        },
        "FHC (PSDB) 1st Term": {
            br: "FHC (PSDB) 1º Man"
        },
        "FHC (PSDB) 2nd Term": {
            br: "FHC (PSDB) 2º Man"
        },
        "Lula (PT) 1st Term": {
            br: "Lula (PT) 1º Man"
        },
        "Lula (PT) 2nd Term": {
            br: "Lula (PT) 2º Man"
        },
        "Dilma (PT) 1st Term": {
            br: "Dilma (PT) 1º Man"
        },
        "Dilma (PT) 2nd Term": {
            br: "Dilma (PT) 2º Man"
        },
        "elections": {
            br: "eleições"
        },
        "Grouping deputies": {
            br: "Agrupar deputados"
        },
        "Number of groups": {
            br: "Número de grupos"
        },
        "Value of": {
            br: "Valor para"
        },
        "Select Deputies": {
            br: "Selecione os Deputados"
        },
        "Select Subjects": {
            br: "Selecione os Temas"
        },
        "Select the grade of similarity": {
            br: "Selecione o grau de similaridade"
        },
        "Select one Roll Call": {
            br: "Selecione uma votação"
        },
        "Select motion types": {
            br: "Selecione tipos de votação"
        },
        "Select the initial and final date": {
            br: "Selecione a data inicial e final"
        },
        "Roll Calls": {
            br: "Votações"
        },
        "Yes (approved)": {
            br: "Sim (aprovado)"
        },
        "No (not approved)": {
            br: "Não (não aprovado)"
        },
        "YES": {
            br: "SIM"
        },
        "NO": {
            br: "NÃO"
        },
        "ABSTENTION": {
            br: "ABSTENÇÃO"
        },
        "OBSTRUCTION": {
            br: "OBSTRUÇÃO"
        },
        "No Votes": {
            br: "Sem Votos"
        },
        "VOTE": {
            br: "VOTO"
        },
        "Map of Roll Calls": {
            br: "Mapa de Votações"
        },
        "to": {
            br: "até"
        },
        "Year": {
            br: "Ano"
        },
        "Feb": {
            br: "Fev"
        },
        "Apr": {
            br: "Abr"
        },
        "May": {
            br: "Maio"
        },
        "Aug": {
            br: "Ago"
        },
        "Sep": {
            br: "Set"
        },
        "Oct": {
            br: "Out"
        },
        "Dec": {
            br: "Dez"
        },
        "Amendment": {
            br: "Emenda"
        }
    }

    if (language === PORTUGUESE) {
        translator = $('body').translate({ lang: "br", t: dict }); //use BR
        $("button .filter-option").text(translator.get("Choose one of the following..."));
        $("#bar-chart").text(translator.get("Create a bar chart"));
        $("#force-layout").text(translator.get("Show parties clusters"));
        $("#scatter-plot-pca").text(translator.get("Create a Political Spectrum of Deputies - Technique: PCA"));
        $("#scatter-plot-mds").text(translator.get("Create a Political Spectrum of Deputies - Technique: MDS"));
        $("#scatter-plot-tsne").text(translator.get("Create a Political Spectrum of Deputies - Technique: t-SNE"));
        $("#chamber-infographic").text(translator.get("Create a Chamber Infographic"));
        $("#deputies-similarity-force").text(translator.get("Create a Deputies Similarity Graph"));
        $("#rollcalls-heatmap").text(translator.get("Create a Map of Roll Calls"));
        $("#time-line-crop-behavior-selection").text(translator.get("Create a timeline with selected deputies"));
    }
}

const subjectsNames = () => {
    return Object.keys(subjectsToEnglish);
}

const subjectsToEnglish = {
    "Defesa e Segurança": "Defense and Security",
    "Administração Pública": "Public Administration",
    "Relações Internacionais e Comércio Exterior": "International Relations and Foreign Trade",
    "Processo Legislativo e Atuação Parlamentar": "Legislative Process and Parliamentary Activity",
    "Economia": "Economy",
    "Direito Penal e Processual Penal": "Criminal Law and Criminal Procedure",
    "Finanças Públicas e Orçamento": "Public Finance and Budget",
    "Política, Partidos e Eleições": "Politics, Parties, and Elections",
    "Viação, Transporte e Mobilidade": "Transportation and Mobility",
    "Meio Ambiente e Desenvolvimento Sustentável": "Environment and Sustainable Development",
    "Direitos Humanos e Minorias": "Human Rights and Minorities",
    "Energia, Recursos Hídricos e Minerais": "Energy, Water Resources, and Minerals",
    "Previdência e Assistência Social": "Social Security and Welfare",
    "Arte, Cultura e Religião": "Arts, Culture, and Religion",
    "Direito Civil e Processual Civil": "Civil Law and Civil Procedure",
    "Educação": "Education",
    "Trabalho e Emprego": "Work and Employment",
    "Saúde": "Health",
    "Cidades e Desenvolvimento Urbano": "Cities and Urban Development",
    "Esporte e Lazer": "Sports and Leisure",
    "Comunicações": "Communications",
    "Agricultura, Pecuária, Pesca e Extrativismo": "Agriculture, Livestock, Fishing, and Extractivism",
    "Homenagens e Datas Comemorativas": "Tributes and Commemorative Dates",
    "Indústria, Comércio e Serviços": "Industry, Trade, and Services",
    "Ciência, Tecnologia e Inovação": "Science, Technology, and Innovation",
    "Estrutura Fundiária": "Land Structure",
    "Turismo": "Tourism",
    "Direito e Defesa do Consumidor": "Consumer Rights and Protection",
    "Direito e Justiça": "Law and Justice"
}