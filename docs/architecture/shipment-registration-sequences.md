# Shipment Registration Sequence Diagrams

Siuntu posistemis dabar yra vartotojo registracijos ir atsiemimo langas, be CRUD sarasu.
Po puslapio refresh frontend busena prarandama ir vel rodoma nauja registracijos forma. Lokaliu
JSON failu siame sraute nera: JSON naudojamas HTTP request/response kunuose, o duomenys saugomi DB.

## 1. Siuntos registracija

```plantuml
@startuml
actor Sender
boundary "ShipmentsView" as ShipmentsView
boundary "ShipmentForm" as ShipmentForm
control "administrationApi.ts" as AdministrationApi
control "shipmentsApi.ts" as ShipmentsApi
control "administration_controller.py" as AdministrationController
control "shipments_controller.py\n(WebController)" as WebController
control "registration_service.py\n(RegistrationController)" as RegistrationController
control "shipment_service.py" as ShipmentService
control "notification_service.py" as NotificationService
control "sticker_service.py" as StickerService
control "Brevo API" as Brevo
database "Database" as Database

ShipmentsView -> AdministrationApi : fetchLockers({})
AdministrationApi -> AdministrationController : GET /api/administration/lockers
AdministrationController -> Database : SELECT non-deleted pastomatai
AdministrationController --> ShipmentsView : JSON list[PastomatasListItem]
ShipmentsView -> ShipmentForm : render lockers in select fields

ShipmentForm -> ShipmentsApi : startShipmentRegistration()
ShipmentsApi -> WebController : POST /api/shipments/registration-sessions
WebController -> RegistrationController : StartSession()
RegistrationController --> WebController : { session_id }
WebController --> ShipmentForm : 201 JSON

Sender -> ShipmentForm : enter sender, receiver, lockers and size
Sender -> ShipmentForm : FinishForm()
ShipmentForm -> ShipmentForm : RegistrationData()
ShipmentForm -> ShipmentForm : ValidateFormData()
ShipmentForm -> ShipmentsApi : validateShipmentRegistrationForm(sessionId, payload)
ShipmentsApi -> WebController : POST /api/shipments/registration-sessions/{sessionId}/validate-form\nJSON ShipmentCreate
WebController -> RegistrationController : ValidateFormData(session_id, payload)
RegistrationController -> ShipmentService : calculate_shipment_price(payload.dydis)
RegistrationController --> WebController : RegistrationPreview JSON
WebController --> ShipmentForm : 200 JSON

alt Sender edits before final confirmation
  Sender -> ShipmentForm : Edit
  ShipmentForm -> ShipmentForm : setCreateStep("form")
else Sender confirms
  Sender -> ShipmentForm : ConfirmForm()
  ShipmentForm -> ShipmentsApi : confirmShipmentRegistration(sessionId, payload)
  ShipmentsApi -> WebController : POST /api/shipments/registration-sessions/{sessionId}/confirm\nJSON ShipmentCreate
  WebController -> RegistrationController : RegisterParcel(session, session_id, payload)
  RegistrationController -> RegistrationController : ValidateRegistrationRequest()
  RegistrationController -> RegistrationController : CreateParcel()
  RegistrationController -> ShipmentService : create_prepared_shipment_model()
  ShipmentService -> Database : INSERT/UPDATE asmenys, siuntejai, gavejai
  ShipmentService -> Database : INSERT siuntos
  RegistrationController -> RegistrationController : UpdateStatus(..., "parengta")
  RegistrationController -> RegistrationController : CreatePayment()
  RegistrationController --> WebController : OnlineRegistrationResponse\nresult = "payment_required"
  WebController --> ShipmentForm : 200 JSON
  ShipmentForm -> ShipmentsApi : requestShipmentPaymentDetails(sessionId)
  ShipmentsApi -> WebController : GET /api/payments/registration-sessions/{sessionId}/details
  WebController --> ShipmentForm : PaymentRequestRead JSON
  Sender -> ShipmentForm : PayForShipment()
  ShipmentForm -> ShipmentsApi : sendShipmentPaymentDetails(sessionId, paymentDetails)
  ShipmentsApi -> WebController : POST /api/payments/registration-sessions/{sessionId}/details\nJSON PaymentActionRequest
  WebController -> RegistrationController : CompletePayment(session, session_id, payload)
  RegistrationController -> RegistrationController : PayOnline()
  RegistrationController -> RegistrationController : UpdateStatus(..., "uzregistruota")
  RegistrationController -> RegistrationController : GenerateParcelLabel()
  RegistrationController -> StickerService : build_sticker_data_from_shipment(shipment)
  RegistrationController -> StickerService : generate_sticker_pdf(stickerData)
  RegistrationController -> RegistrationController : CreateRegistrationConfirmationMessage()
  RegistrationController -> NotificationService : send_registration_confirmation_email(message)
  NotificationService -> NotificationService : base64 encode prepared PDF
  NotificationService -> Brevo : POST /v3/smtp/email\nJSON textContent + attachment
  alt email send fails
    RegistrationController -> RegistrationController : log failure and keep registration successful
  end
  WebController --> ShipmentForm : PaymentResultRead JSON
  ShipmentForm -> ShipmentsView : onCreateComplete(shipment, message)
  ShipmentsView -> ShipmentsView : show summary only
  ShipmentForm -> ShipmentsApi : cancelShipmentRegistrationSession(sessionId)
end
@enduml
```

Eiles tvarka:

1. `ShipmentsView` uzkrauna nepanaikintu pastomatu sarasa per `fetchLockers()`.
2. `ShipmentForm` rodo tik registracijos laukus: siunteja, gaveja, siuntimo/gavimo pastomatus ir dydi.
3. `FinishForm()` surenka `RegistrationData()`, validuoja `ValidateFormData()` ir kviecia backend formos perziurai.
4. Pries galutini patvirtinima vartotojas gali grizti i forma ir redaguoti duomenis.
5. `ConfirmForm()` sukuria siunta DB per `RegisterParcel()`.
6. Registracija visada pereina i online apmokejimo langa.
7. `PayForShipment()` patvirtina mokejima, sukuria lipduko PDF ir siuntejui issiuncia
   patvirtinimo el. laiska su `sticker_<shipmentCode>.pdf` prisegtuku.
8. Jei Brevo el. laisko siuntimas nepavyksta, klaida tik uzregistruojama serverio loge,
   o siuntos registracija lieka sekminga.
9. Po refresh summary dingsta, nes `registeredShipment` yra tik React state.

## 2. Lipduko atsisiuntimas is summary

```plantuml
@startuml
actor Sender
boundary "ShipmentsView\n(summary)" as Summary
control "stickersApi.ts" as StickersApi
control "client.ts" as ApiClient
control "sticker_controller.py" as StickerController
entity "PDF Blob" as PdfBlob

Sender -> Summary : PrintSticker()
Summary -> StickersApi : requestStickerPdf(registeredShipment)
StickersApi -> StickersApi : buildStickerRequest(shipment)\n(no amount, no status)
StickersApi -> ApiClient : apiPostBlob("/api/stickers/generate", StickerRequest)
ApiClient -> StickerController : POST /api/stickers/generate\nJSON StickerRequest
StickerController -> StickerController : generate_sticker()
StickerController -> StickerController : qrcode.QRCode()
StickerController -> StickerController : FPDF output
StickerController --> ApiClient : 200 application/pdf
ApiClient --> StickersApi : PDF Blob
StickersApi --> Summary : PDF Blob
Summary -> Summary : downloadStickerPdf()
Summary --> Sender : downloads sticker_<shipmentCode>.pdf
@enduml
```

## 3. Siuntos atsiemimas pagal koda

```plantuml
@startuml
actor Receiver
boundary "LockerPickupSimulator" as Pickup
control "lockerPickupApi.ts" as LockerApi
control "locker_controller.py" as LockerController
control "locker_service.py" as LockerService
control "shipment_service.py" as ShipmentService
database "Database" as Database

Pickup -> LockerApi : fetchDemoLockerState()
LockerApi -> LockerController : GET /api/lockers/demo
LockerController -> LockerService : get_locker_state()
LockerService -> Database : SELECT demo locker + cells
alt demo locker missing
  LockerService -> Database : INSERT demo locker + cells
end
LockerController --> Pickup : LockerStateResponse JSON

Receiver -> Pickup : enter parcel code
Receiver -> Pickup : OpenPickupLocker()
Pickup -> LockerApi : openPickupLocker(code)
LockerApi -> LockerController : POST /api/lockers/demo/pickup/open\nJSON { siuntos_kodas }
LockerController -> LockerService : open_pickup_locker(session, code)
LockerService -> ShipmentService : get_shipment_by_code_model(session, code)
ShipmentService -> Database : SELECT siuntos by siuntos_kodas
alt shipment.busena != "pristatyta"
  LockerService --> LockerController : 409 error
else delivered shipment
  alt shipment has no locker cell
    LockerService -> LockerService : _find_free_cell(locker, shipment)
    LockerService -> ShipmentService : save_shipment()
    ShipmentService -> Database : UPDATE pastomato_skyrius_id
  end
  LockerService -> LockerService : _set_active_session()
  LockerController --> Pickup : LockerActionResponse JSON
end

Receiver -> Pickup : CloseLockerDoors()
Pickup -> LockerApi : closeLockerDoors()
LockerApi -> LockerController : POST /api/lockers/demo/close
LockerController -> LockerService : close_locker_doors(session)
LockerService -> ShipmentService : get_shipment_model(session, active.siuntos_id)
LockerService -> ShipmentService : save_shipment()
ShipmentService -> Database : UPDATE busena = "atsiimta"\nUPDATE pastomato_skyrius_id = null
LockerService -> LockerService : _set_active_session(None)
LockerController --> Pickup : LockerActionResponse JSON
@enduml
```

Eiles tvarka:

1. `LockerPickupSimulator` rodo kodo ivedimo lauka, ne siuntu sarasa.
2. `OpenPickupLocker()` kviecia `POST /api/lockers/demo/pickup/open`.
3. Backend leidzia atidaryti duris tik siuntai su busena `pristatyta`.
4. `CloseLockerDoors()` pakeicia busena i `atsiimta` ir isvalo pastomato skyriu.
