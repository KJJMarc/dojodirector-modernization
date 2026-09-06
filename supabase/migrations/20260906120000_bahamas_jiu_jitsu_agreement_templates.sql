-- Seed full Bahamas Jiu Jitsu membership and guest training agreements.
-- Replaces placeholder template bodies seeded with the Bahamas club.

DO $bahamas_agreements$
DECLARE
  bahamas_club_id uuid := '276cb805-7095-4e78-984b-bb41fb2cb664';
  membership_body text := $bahamas_membership_body$
BAHAMAS JIU JITSU

MEMBERSHIP AGREEMENT

Version 1.0

Welcome to Bahamas Jiu Jitsu.

This agreement applies to all training activities provided by Bahamas Jiu Jitsu in Nassau, The Bahamas, including but not limited to Brazilian Jiu Jitsu, grappling, wrestling, takedowns, striking classes, fitness training, conditioning sessions, seminars, competitions and related academy activities.

By selecting "I Agree" and signing electronically, I confirm that I have read, understood and accepted the terms of this agreement.

---

## TRAINING RISKS

I understand that martial arts and combat sports involve physical contact and carry an inherent risk of injury.

Possible injuries may include bruises, cuts, strains, sprains, joint injuries, fractures, concussion and other minor or serious injuries that may occur during training.

I voluntarily choose to participate in training activities and accept the ordinary risks that are inherent in martial arts training.

---

## SAFE TRAINING

I agree to train safely, responsibly and respectfully at all times.

I will follow the instructions of instructors and academy staff.

I will immediately stop training and inform an instructor if I believe that continuing to train may place myself or another participant at risk.

---

## HEALTH DECLARATION

I confirm that I am responsible for informing the academy of any medical condition, injury or health concern that may affect my ability to participate safely.

I understand that the academy does not provide medical advice and that participation decisions remain my responsibility.

If I am injured or become unwell during training, I will inform an instructor as soon as reasonably possible.

---

## HYGIENE AND SAFETY

I agree to maintain appropriate personal hygiene and training equipment standards.

I understand that I should not attend training if I have a contagious illness, infectious skin condition or any condition that could place other members at risk.

---

## MEMBERSHIP AND CONDUCT

I understand that academy membership may be suspended or terminated if I behave in a manner that is unsafe, abusive, threatening, discriminatory or otherwise inappropriate towards members, instructors or staff.

---

## PHOTOGRAPHS AND VIDEO

I understand that photographs or video may occasionally be taken during classes, seminars or academy events for coaching, promotional or educational purposes.

If I do not wish to appear in photographs or video, I will notify the academy.

---

## DATA PROTECTION

I understand that Bahamas Jiu Jitsu will store and process personal information for legitimate academy purposes including membership administration, attendance tracking, grading records, communication and safety management.

Personal information will be handled in accordance with applicable data protection laws of the Commonwealth of The Bahamas.

---

## LIABILITY

I understand that Bahamas Jiu Jitsu instructors and staff will take reasonable steps to provide a safe training environment but cannot eliminate all risks associated with participation in martial arts activities.

I accept responsibility for my own conduct and participation while training.

Nothing in this agreement affects any legal rights that cannot be excluded under the applicable laws of the Commonwealth of The Bahamas.

---

## PARENT OR LEGAL GUARDIAN CONSENT

If the participant is under 18 years of age, the person signing this agreement confirms that they are the participant's parent or legal guardian and have authority to accept this agreement on the participant's behalf.

The parent or legal guardian consents to the participant taking part in academy activities and accepts the responsibilities outlined in this agreement on behalf of the participant where applicable.

---

## ELECTRONIC ACCEPTANCE

By selecting "I Agree" within the student portal, I confirm that I have read, understood and accepted this Membership Agreement.

My name, date, time of acceptance and electronic acceptance record will be stored within Dojo Director as evidence of acceptance.

---

## GOVERNING LAW

This agreement is governed by the laws of the Commonwealth of The Bahamas.
$bahamas_membership_body$;
  guest_body text := $bahamas_guest_body$
BAHAMAS JIU JITSU

TRAINING AGREEMENT

Version 1.0

Welcome to Bahamas Jiu Jitsu.

This agreement applies to all training activities provided by Bahamas Jiu Jitsu in Nassau, The Bahamas, including but not limited to Brazilian Jiu Jitsu, grappling, wrestling, takedowns, striking classes, fitness training, conditioning sessions, seminars, competitions and related academy activities.

By selecting "I Agree" and signing electronically, I confirm that I have read, understood and accepted the terms of this agreement.

---

## TRAINING RISKS

I understand that martial arts and combat sports involve physical contact and carry an inherent risk of injury.

Possible injuries may include bruises, cuts, strains, sprains, joint injuries, fractures, concussion and other minor or serious injuries that may occur during training.

I voluntarily choose to participate in training activities and accept the ordinary risks that are inherent in martial arts training.

---

## SAFE TRAINING

I agree to train safely, responsibly and respectfully at all times.

I will follow the instructions of instructors and academy staff.

I will immediately stop training and inform an instructor if I believe that continuing to train may place myself or another participant at risk.

---

## HEALTH DECLARATION

I confirm that I am responsible for informing the academy of any medical condition, injury or health concern that may affect my ability to participate safely.

I understand that the academy does not provide medical advice and that participation decisions remain my responsibility.

If I am injured or become unwell during training, I will inform an instructor as soon as reasonably possible.

---

## HYGIENE AND SAFETY

I agree to maintain appropriate personal hygiene and training equipment standards.

I understand that I should not attend training if I have a contagious illness, infectious skin condition or any condition that could place other members at risk.

---

## MEMBERSHIP AND CONDUCT

I understand that academy membership may be suspended or terminated if I behave in a manner that is unsafe, abusive, threatening, discriminatory or otherwise inappropriate towards members, instructors or staff.

---

## PHOTOGRAPHS AND VIDEO

I understand that photographs or video may occasionally be taken during classes, seminars or academy events for coaching, promotional or educational purposes.

If I do not wish to appear in photographs or video, I will notify the academy.

---

## DATA PROTECTION

I understand that Bahamas Jiu Jitsu will store and process personal information for legitimate academy purposes including membership administration, attendance tracking, grading records, communication and safety management.

Personal information will be handled in accordance with applicable data protection laws of the Commonwealth of The Bahamas.

---

## LIABILITY

I understand that Bahamas Jiu Jitsu instructors and staff will take reasonable steps to provide a safe training environment but cannot eliminate all risks associated with participation in martial arts activities.

I accept responsibility for my own conduct and participation while training.

Nothing in this agreement affects any legal rights that cannot be excluded under the applicable laws of the Commonwealth of The Bahamas.

---

## PARENT OR LEGAL GUARDIAN CONSENT

If the participant is under 18 years of age, the person signing this agreement confirms that they are the participant's parent or legal guardian and have authority to accept this agreement on the participant's behalf.

The parent or legal guardian consents to the participant taking part in academy activities and accepts the responsibilities outlined in this agreement on behalf of the participant where applicable.

---

## ELECTRONIC ACCEPTANCE

By selecting "I Agree" within the student portal, I confirm that I have read, understood and accepted this Training Agreement.

My name, date, time of acceptance and electronic acceptance record will be stored within Dojo Director as evidence of acceptance.

---

## GOVERNING LAW

This agreement is governed by the laws of the Commonwealth of The Bahamas.
$bahamas_guest_body$;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'club_agreement_templates'
  ) THEN
    RAISE NOTICE 'club_agreement_templates missing; skip Bahamas agreement seed';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.clubs WHERE id = bahamas_club_id AND slug = 'bahamas-jiu-jitsu'
  ) THEN
    RAISE NOTICE 'Bahamas Jiu Jitsu club not found; skip agreement seed';
    RETURN;
  END IF;

  UPDATE public.club_agreement_templates
  SET is_active = false,
      updated_at = now()
  WHERE club_id = bahamas_club_id
    AND agreement_type IN ('member_portal_agreement', 'guest_training_agreement')
    AND is_active = true;

  INSERT INTO public.club_agreement_templates (
    club_id,
    agreement_type,
    title,
    version,
    body,
    is_active
  ) VALUES
    (
      bahamas_club_id,
      'member_portal_agreement',
      'Bahamas Jiu Jitsu Membership Agreement',
      '1.0',
      membership_body,
      true
    ),
    (
      bahamas_club_id,
      'guest_training_agreement',
      'Bahamas Jiu Jitsu Training Agreement',
      '1.0',
      guest_body,
      true
    );
END;
$bahamas_agreements$;
