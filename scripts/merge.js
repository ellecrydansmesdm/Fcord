const fs = require('fs');
const current = {
  "1348347939474374786": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord",
      "auto": true
    },
    {
      "badge": "https://i.imgur.com/dvgfcuW.png",
      "tooltip": "Helper NightCord",
      "auto": true
    }
  ],
  "235278667511496704": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord",
      "auto": true
    },
    {
      "badge": "https://i.imgur.com/vVTYtji.png",
      "tooltip": "Developer NightCord",
      "auto": true
    },
    {
      "badge": "https://i.imgur.com/dvgfcuW.png",
      "tooltip": "Helper NightCord",
      "auto": true
    }
  ],
  "236634449129897985": [
    {
      "badge": "https://i.imgur.com/bntESR1.png",
      "tooltip": "Attachante x SS"
    }
  ],
  "1129204956164010114": [
    {
      "badge": "https://i.imgur.com/gScnjLU.gif",
      "tooltip": "Citron"
    },
    {
      "badge": "https://i.imgur.com/fkP9nBl.png",
      "tooltip": "Citron X Attachante"
    }
  ]
};

const old = {
  "1163470989439553537": [
    {
      "badge": "https://i.imgur.com/sr7Su5H.png",
      "tooltip": "Contributor"
    }
  ],
  "119359281173626882": [
    {
      "badge": "https://i.imgur.com/sr7Su5H.png",
      "tooltip": "Contributor"
    }
  ],
  "1416624935845101588": [
    {
      "badge": "https://i.imgur.com/x3CIv9a.gif",
      "tooltip": "Himura"
    }
  ],
  "1204515793455546438": [
    {
      "badge": "https://i.imgur.com/kVoJJ2T.gif",
      "tooltip": "Sexy"
    },
    {
      "badge": "https://i.imgur.com/ksv6REv.png",
      "tooltip": "Bug Hunter lv1"
    }
  ],
  "1263896177506783354": [
    {
      "badge": "https://i.imgur.com/kVoJJ2T.gif",
      "tooltip": "Sexy"
    }
  ],
  "1330609478034264125": [
    {
      "badge": "https://i.imgur.com/jO59QXt.png",
      "tooltip": "Server Booster",
      "auto": true
    }
  ],
  "1391089657630036028": [
    {
      "badge": "https://i.imgur.com/jO59QXt.png",
      "tooltip": "Server Booster",
      "auto": true
    }
  ],
  "1391643768444157984": [
    {
      "badge": "https://i.imgur.com/jO59QXt.png",
      "tooltip": "Server Booster",
      "auto": true
    }
  ],
  "1341673501949693972": [
    {
      "badge": "https://i.imgur.com/shcRENk.png",
      "tooltip": "Catman"
    }
  ],
  "1456684184168042496": [
    {
      "badge": "https://i.imgur.com/8uORttL.png",
      "tooltip": "Audio Engineer"
    }
  ],
  "472971966333321216": [
    {
      "badge": "https://i.imgur.com/MbOlTw3.png",
      "tooltip": "Supporters NightCord"
    },
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    },
    {
      "badge": "https://i.imgur.com/A1Bxe25.gif",
      "tooltip": "Server Booster"
    }
  ],
  "1486134878243127438": [
    {
      "badge": "https://i.imgur.com/MbOlTw3.png",
      "tooltip": "Supporters NightCord",
      "auto": true
    }
  ],
  "1463560204259164404": [
    {
      "badge": "https://i.imgur.com/RwDByY6.png",
      "tooltip": "Staff NightCord",
      "auto": true
    }
  ],
  "1355136568033022042": [
    {
      "badge": "https://i.imgur.com/MbOlTw3.png",
      "tooltip": "Supporters NightCord",
      "auto": true
    },
    {
      "badge": "https://i.imgur.com/wilEsKO.gif",
      "tooltip": "Himura"
    }
  ],
  "1473635887891087390": [
    {
      "badge": "https://i.imgur.com/MbOlTw3.png",
      "tooltip": "Supporters NightCord",
      "auto": true
    }
  ],
  "407134577748869122": [
    {
      "badge": "https://i.imgur.com/vVTYtji.png",
      "tooltip": "Developer NightCord"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "587626543874834463": [
    {
      "badge": "https://i.imgur.com/vVTYtji.png",
      "tooltip": "Developer NightCord"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "486907704087019521": [
    {
      "badge": "https://i.imgur.com/xPk6UH7.png",
      "tooltip": "Yume"
    },
    {
      "badge": "https://i.imgur.com/vVTYtji.png",
      "tooltip": "Developer NightCord"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "1188391631662108752": [
    {
      "badge": "https://i.imgur.com/gOtCMQ9.png",
      "tooltip": "Bug Hunter lv2"
    },
    {
      "badge": "https://i.imgur.com/NHI5spS.png",
      "tooltip": "OG"
    },
    {
      "badge": "https://i.imgur.com/zhdipRq.png",
      "tooltip": "Creator Of NightCord"
    },
    {
      "badge": "https://i.imgur.com/gVC6iEZ.png",
      "tooltip": "Verified"
    }
  ],
  "1356682833954996376": [
    {
      "badge": "https://i.imgur.com/vVTYtji.png",
      "tooltip": "Developer NightCord",
      "auto": true
    }
  ],
  "1240373094439194627": [
    {
      "badge": "https://i.imgur.com/A1Bxe25.gif",
      "tooltip": "Server Booster"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "1378821858069188709": [
    {
      "badge": "https://i.imgur.com/SyvIw01.png",
      "tooltip": "Certified Artist"
    }
  ],
  "1497988515701723286": [
    {
      "badge": "https://i.imgur.com/NHI5spS.png",
      "tooltip": "OG"
    },
    {
      "badge": "https://i.imgur.com/gVC6iEZ.png",
      "tooltip": "Verified"
    }
  ],
  "345379266248048641": [
    {
      "badge": "https://i.imgur.com/unkPrLE.png",
      "tooltip": "Sea Shepherd"
    },
    {
      "badge": "https://i.imgur.com/MbOlTw3.png",
      "tooltip": "Supporters NightCord",
      "auto": true
    },
    {
      "badge": "https://i.imgur.com/A1Bxe25.gif",
      "tooltip": "Server Booster"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "1455375632794910855": [
    {
      "badge": "https://i.imgur.com/MbOlTw3.png",
      "tooltip": "Supporters NightCord",
      "auto": true
    }
  ],
  "1346847329034178592": [
    {
      "badge": "https://i.imgur.com/A1Bxe25.gif",
      "tooltip": "Server Booster",
      "auto": true
    }
  ],
  "1414541292842782820": [
    {
      "badge": "https://i.imgur.com/A1Bxe25.gif",
      "tooltip": "Server Booster",
      "auto": true
    }
  ],
  "1428046101490958457": [
    {
      "badge": "https://i.imgur.com/A1Bxe25.gif",
      "tooltip": "Server Booster",
      "auto": true
    }
  ],
  "1346827950892257393": [
    {
      "badge": "https://i.imgur.com/A1Bxe25.gif",
      "tooltip": "Server Booster",
      "auto": true
    }
  ],
  "1346819231605461084": [
    {
      "badge": "https://i.imgur.com/A1Bxe25.gif",
      "tooltip": "Server Booster",
      "auto": true
    }
  ],
  "1475754814624366753": [
    {
      "badge": "https://i.imgur.com/olCxFHJ.gif",
      "tooltip": "Donor NightCord"
    },
    {
      "badge": "https://i.imgur.com/4hLdFnO.png",
      "tooltip": "eth boy"
    },
    {
      "badge": "https://i.imgur.com/5au2YYS.png",
      "tooltip": "xmr boy"
    },
    {
      "badge": "https://i.imgur.com/fFraI5F.png",
      "tooltip": "solana boy"
    }
  ],
  "954196209181024296": [
    {
      "badge": "https://i.imgur.com/cX2tI0F.gif",
      "tooltip": "k7b"
    }
  ],
  "1500689375120330772": [
    {
      "badge": "https://i.imgur.com/UVWeD4M.png",
      "tooltip": "Staff NightCord",
      "auto": true
    }
  ],
  "1402078137671749684": [
    {
      "badge": "https://i.imgur.com/dvgfcuW.png",
      "tooltip": "Helper NightCord",
      "auto": true
    }
  ],
  "1401781248560726126": [
    {
      "badge": "https://i.imgur.com/NHI5spS.png",
      "tooltip": "OG"
    },
    {
      "badge": "https://i.imgur.com/gVC6iEZ.png",
      "tooltip": "Verified"
    }
  ],
  "1086802921984893038": [
    {
      "badge": "https://i.imgur.com/Wyw0BqM.png",
      "tooltip": "Partner"
    },
    {
      "badge": "https://i.imgur.com/SxrexRu.png",
      "tooltip": "Early Verified Developer"
    },
    {
      "badge": "https://i.imgur.com/YR1DCoB.png",
      "tooltip": "Early Supporter"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "1098251321682968597": [
    {
      "badge": "https://i.imgur.com/Wyw0BqM.png",
      "tooltip": "Partner"
    },
    {
      "badge": "https://i.imgur.com/YR1DCoB.png",
      "tooltip": "Early Supporter"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "1006980582212907048": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord",
      "auto": true
    },
    {
      "badge": "https://i.imgur.com/A1Bxe25.gif",
      "tooltip": "Server Booster",
      "auto": true
    }
  ],
  "1258544075712364544": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord",
      "auto": true
    }
  ],
  "1465132432360734958": [
    {
      "badge": "https://i.imgur.com/ZaBE4lJ.png",
      "tooltip": "Free Palestine"
    }
  ],
  "264549075930578945": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord",
      "auto": true
    },
    {
      "badge": "https://i.imgur.com/A1Bxe25.gif",
      "tooltip": "Server Booster",
      "auto": true
    }
  ],
  "523567699004227609": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord",
      "auto": true
    },
    {
      "badge": "https://i.imgur.com/A1Bxe25.gif",
      "tooltip": "Server Booster",
      "auto": true
    }
  ],
  "1473738171811365020": [
    {
      "badge": "https://i.imgur.com/gOtCMQ9.png",
      "tooltip": "Bug Hunter lv2"
    },
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    },
    {
      "badge": "https://i.imgur.com/dvgfcuW.png",
      "tooltip": "Helper NightCord"
    },
    {
      "badge": "https://i.imgur.com/nWE1O2F.gif",
      "tooltip": "Top 100"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "242001121672036352": [
    {
      "badge": "https://i.imgur.com/dvgfcuW.png",
      "tooltip": "Helper NightCord"
    }
  ],
  "1487862786083127429": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    },
    {
      "badge": "https://i.imgur.com/vVTYtji.png",
      "tooltip": "Developer NightCord"
    },
    {
      "badge": "https://i.imgur.com/olCxFHJ.gif",
      "tooltip": "Donor NightCord"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "1156649068295110796": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    },
    {
      "badge": "https://i.imgur.com/dvgfcuW.png",
      "tooltip": "Helper NightCord"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "1480844053754155028": [
    {
      "badge": "https://i.imgur.com/dvgfcuW.png",
      "tooltip": "Helper NightCord"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "745391667703709728": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    },
    {
      "badge": "https://i.imgur.com/dvgfcuW.png",
      "tooltip": "Helper NightCord"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "799364797870375013": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "1457055283690868967": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "1439760330275164332": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "163704635960328192": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "832641869337985106": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "652888396842139668": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "532626420976058408": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "1143986011999834162": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord",
      "auto": true
    },
    {
      "badge": "https://i.imgur.com/A1Bxe25.gif",
      "tooltip": "Server Booster",
      "auto": true
    }
  ],
  "474828930109669386": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "166931302262505473": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "1453892754273992716": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "440547565335740428": [
    {
      "badge": "https://i.imgur.com/dvgfcuW.png",
      "tooltip": "Helper NightCord"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "1438607981779484795": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "1399358581949599867": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "1039978099548377088": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    },
    {
      "badge": "https://i.imgur.com/dvgfcuW.png",
      "tooltip": "Helper NightCord"
    },
    {
      "badge": "https://i.imgur.com/UVWeD4M.png",
      "tooltip": "Staff NightCord"
    }
  ],
  "1439999101549809705": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "910153578377797662": [
    {
      "badge": "https://i.imgur.com/dvgfcuW.png",
      "tooltip": "Helper NightCord"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "1172305545554825259": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "1339691683595681823": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "1316810581876936708": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "1248925757162524724": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "800789023664111646": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    }
  ],
  "229423089241423872": [
    {
      "name": "VIP",
      "icon": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP",
      "badge": "https://i.imgur.com/tkxNYVs.png"
    }
  ],
  "1488181371699593357": [
    {
      "badge": "https://i.imgur.com/vVTYtji.png",
      "tooltip": "Developer NightCord",
      "auto": true
    },
    {
      "badge": "https://i.imgur.com/GIrguYy.gif",
      "tooltip": "octane"
    }
  ],
  "310297731744923648": [
    {
      "badge": "https://i.imgur.com/A1Bxe25.gif",
      "tooltip": "Server Booster",
      "auto": true
    }
  ],
  "904849019023532062": [
    {
      "badge": "https://i.imgur.com/GIKBxsl.png",
      "tooltip": "Free Palestine"
    }
  ],
  "1362882018160939078": [
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "889101384287395860": [
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "213872536063180800": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord"
    },
    {
      "badge": "https://i.imgur.com/7A3sexF.png",
      "tooltip": "Gifter NightCord"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "1062378526436753569": [
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ],
  "499609326613299221": [
    {
      "name": "VIP",
      "icon": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP",
      "badge": "https://i.imgur.com/tkxNYVs.png"
    }
  ],
  "1496940400630300673": [
    {
      "badge": "https://i.imgur.com/Wyw0BqM.png",
      "tooltip": "Partner"
    }
  ],
  "498881990896910339": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord",
      "auto": true
    }
  ],
  "934325874931675167": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord",
      "auto": true
    }
  ],
  "663118442471227424": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord",
      "auto": true
    }
  ],
  "1385995213511594136": [
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    },
    {
      "badge": "https://i.imgur.com/pz0MHCC.gif",
      "tooltip": "! ARCH X ATTACHANTE"
    }
  ],
  "1115303190951383160": [
    {
      "badge": "https://i.imgur.com/Rr3Ixu0.gif",
      "tooltip": "Supporters NightCord",
      "auto": true
    }
  ],
  "1371194510482210990": [
    {
      "badge": "https://i.imgur.com/ksv6REv.png",
      "tooltip": "Bug Hunter lv1"
    },
    {
      "badge": "https://i.imgur.com/tkxNYVs.png",
      "tooltip": "VIP"
    }
  ]
};

const result = { ...current };

// Merge arrays for duplicate IDs
for (const key in old) {
  if (result[key]) {
    // concatenate uniquely by comparing tooltip and badge
    const existing = result[key];
    const incoming = old[key];
    for (const badge of incoming) {
      if (!existing.some(e => e.badge === badge.badge && e.tooltip === badge.tooltip)) {
        existing.push(badge);
      }
    }
  } else {
    result[key] = old[key];
  }
}

fs.writeFileSync('merged_badges.json', JSON.stringify(result, null, 2));
console.log("MERGE SUCCESS");
