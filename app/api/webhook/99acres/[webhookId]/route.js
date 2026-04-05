import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { parseStringPromise } from "xml2js";

/**
 * Customer-specific 99acres Webhook Endpoint
 * 
 * Each customer gets a unique webhook URL: /api/webhook/99acres/{webhookId}
 * The webhookId maps to a specific customer's database, so leads go directly
 * to the correct customer without scanning all databases.
 */
export async function POST(request, { params }) {
  const { webhookId } = await params;

  try {
    const client = await clientPromise;

    // Look up which customer this webhook belongs to
    const superAdminDb = client.db("leadrabbit_superadmin");
    const customer = await superAdminDb
      .collection("customers")
      .findOne({ "webhooks.99acres": webhookId });

    if (!customer) {
      console.warn(`❌ 99acres webhook: Unknown webhookId ${webhookId}`);
      return NextResponse.json(
        { error: "Invalid webhook URL" },
        { status: 404 }
      );
    }

    // Get the raw body as text
    const bodyText = await request.text();

    // Parse XML
    const parsedXml = await parseStringPromise(bodyText);

    if (!parsedXml.Xml) {
      return NextResponse.json(
        { error: "Invalid XML structure" },
        { status: 400 }
      );
    }

    // Check ActionStatus
    if (parsedXml.Xml.$.ActionStatus !== "true") {
      const errorDetail = parsedXml.Xml.ErrorDetail?.[0];
      const errorMessage = errorDetail?.Message?.[0] || "Unknown error";
      console.warn(`❌ 99acres webhook [${customer.customerName}]: ActionStatus false - ${errorMessage}`);
      return NextResponse.json(
        { success: false, message: "ActionStatus is false", error: errorMessage },
        { status: 400 }
      );
    }

    const customerDb = client.db(customer.databaseName);
    let totalLeadsProcessed = 0;

    // Verify customer has an active 99acres account
    const activeAccount = await customerDb
      .collection("99acresIntegrations")
      .findOne({ isActive: true });

    if (!activeAccount) {
      console.warn(`⚠️ 99acres webhook [${customer.customerName}]: No active 99acres account`);
      return NextResponse.json({
        success: false,
        message: "No active 99acres integration for this customer",
      }, { status: 400 });
    }

    // Parse responses from webhook
    const responses = Array.isArray(parsedXml.Xml.Resp)
      ? parsedXml.Xml.Resp
      : [parsedXml.Xml.Resp];

    console.log(
      `📨 99acres webhook [${customer.customerName}]: ${responses.length} lead(s) received`
    );

    for (const resp of responses) {
      const qryDtl = resp.QryDtl?.[0];
      const cntctDtl = resp.CntctDtl?.[0];

      if (!qryDtl || !cntctDtl) {
        console.warn(`⚠️ 99acres webhook [${customer.customerName}]: Invalid response structure`);
        continue;
      }

      const leadData = {
        source: "99acres",
        name: (cntctDtl.Name?.[0] || "Unknown").trim(),
        email: (cntctDtl.Email?.[0] || "").toLowerCase().trim(),
        phone: (cntctDtl.Phone?.[0] || "").trim(),
        status: "New",
        createdAt: new Date(),
        updatedAt: new Date(),
        accountId: activeAccount._id,
        metaData: {
          platform: "99acres",
          queryId: qryDtl.$.QueryId,
          responseType: qryDtl.$.ResType,
          propertyDescription: cntctDtl.CmpctLabl?.[0] || qryDtl.CmpctLabl?.[0],
          queryInfo: qryDtl.QryInfo?.[0],
          receivedOn: qryDtl.RcvdOn?.[0],
          projectId: qryDtl.ProjId?.[0],
          projectName: qryDtl.ProjName?.[0],
          cityName: qryDtl.CityName?.[0],
          propertyType: qryDtl.ResCom?.[0],
          price: parseInt(qryDtl.Price?.[0] || "0"),
          phoneVerified: qryDtl.PhoneVerificationStatus?.[0] === "VERIFIED",
          emailVerified: qryDtl.EmailVerificationStatus?.[0] === "VERIFIED",
          identity: qryDtl.IDENTITY?.[0],
          propertyCode: qryDtl.PROPERTY_CODE?.[0],
          productId: qryDtl.ProdId?.[0]?._,
          productStatus: qryDtl.ProdId?.[0]?.$.Status,
          productType: qryDtl.ProdId?.[0]?.$.Type,
        },
      };

      // Check for duplicate by queryId
      const existingLead = await customerDb
        .collection("leads")
        .findOne({
          source: "99acres",
          "metaData.queryId": leadData.metaData.queryId,
        });

      if (!existingLead) {
        await customerDb.collection("leads").insertOne(leadData);
        totalLeadsProcessed++;
      }
    }

    console.log(
      `✅ 99acres webhook [${customer.customerName}]: ${totalLeadsProcessed} leads processed`
    );

    return NextResponse.json({
      success: true,
      leadsProcessed: totalLeadsProcessed,
      message: `Successfully processed ${totalLeadsProcessed} leads`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 99acres webhook error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
